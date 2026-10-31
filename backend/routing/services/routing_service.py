"""
Routing Service for Weather-Aware Truck Routing.
Supports OpenRouteService (HGV truck engine), Mapbox Directions, and OSRM public engine.
Performs geodesic interpolation to sample checkpoints every 10 / 25 / 50 miles.
Calculates checkpoint ETAs and segment mileages.
"""

import os
import math
import requests
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple, Optional
from django.core.cache import cache
from django.conf import settings

OSRM_ROUTE_URL = "https://router.project-osrm.org/route/v1/driving"
ORS_API_URL = "https://api.openrouteservice.org/v2/directions/driving-hgv/geojson"
MAPBOX_DIRECTIONS_URL = "https://api.mapbox.com/directions/v5/mapbox/driving"

METERS_TO_MILES = 0.000621371
MILES_TO_METERS = 1609.34

# Reusable HTTP session with connection pooling
HTTP_SESSION = requests.Session()


def haversine_distance_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Great Circle distance between two points in miles."""
    r = 3958.8
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def interpolate_coordinate(lat1: float, lon1: float, lat2: float, lon2: float, fraction: float) -> Tuple[float, float]:
    """Linearly interpolate between two coordinates."""
    lat = lat1 + (lat2 - lat1) * fraction
    lon = lon1 + (lon2 - lon1) * fraction
    return lat, lon


def simplify_polyline_rdp(points: List[List[float]], epsilon: float = 0.0001) -> List[List[float]]:
    """
    Ramer-Douglas-Peucker simplification for visual map rendering.
    epsilon = 0.0001 degrees is approx 11 meters (highway lane width).
    Reduces thousands of redundant collinear GPS vertices by ~85%
    without visual degradation of the road curvature.
    """
    if len(points) < 3:
        return points

    # Iterative stack to prevent recursion limit on large geometries
    stack = [(0, len(points) - 1)]
    keep = [False] * len(points)
    keep[0] = True
    keep[-1] = True
    eps_sq = epsilon * epsilon

    while stack:
        start_idx, end_idx = stack.pop()
        if end_idx <= start_idx + 1:
            continue

        x1, y1 = points[start_idx][0], points[start_idx][1]
        x2, y2 = points[end_idx][0], points[end_idx][1]
        dx = x2 - x1
        dy = y2 - y1
        mag_sq = dx * dx + dy * dy

        max_dist_sq = 0.0
        max_idx = start_idx

        for i in range(start_idx + 1, end_idx):
            px, py = points[i][0], points[i][1]
            if mag_sq == 0:
                dist_sq = (px - x1) ** 2 + (py - y1) ** 2
            else:
                u = ((px - x1) * dx + (py - y1) * dy) / mag_sq
                u = max(0.0, min(1.0, u))
                ix = x1 + u * dx
                iy = y1 + u * dy
                dist_sq = (px - ix) ** 2 + (py - iy) ** 2

            if dist_sq > max_dist_sq:
                max_dist_sq = dist_sq
                max_idx = i

        if max_dist_sq > eps_sq:
            keep[max_idx] = True
            stack.append((start_idx, max_idx))
            stack.append((max_idx, end_idx))

    return [points[i] for i, k in enumerate(keep) if k]


def sample_polyline_by_distance(
    coords: List[List[float]],
    total_duration_sec: float,
    step_miles: float,
    departure_time: datetime
) -> List[Dict[str, Any]]:
    """
    Sample a route polyline (list of [lon, lat]) at exact intervals of step_miles (10, 25, 50).
    Uses monotonically progressing single-pass coordinate search for O(N + M) efficiency.
    """
    if not coords or len(coords) < 2:
        return []

    vertex_distances = [0.0]
    total_dist = 0.0
    for i in range(1, len(coords)):
        seg_dist = haversine_distance_miles(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0])
        total_dist += seg_dist
        vertex_distances.append(total_dist)

    if total_dist <= 0:
        total_dist = 0.001

    target_distances = [0.0]
    curr = step_miles
    while curr < total_dist - (step_miles * 0.25):
        target_distances.append(curr)
        curr += step_miles
    target_distances.append(total_dist)

    checkpoints = []
    prev_sampled_dist = 0.0
    num_coords = len(coords)
    v_idx = 1

    for target_dist in target_distances:
        found_coord = None
        # Monotonically advance v_idx
        while v_idx < num_coords and vertex_distances[v_idx] < target_dist:
            v_idx += 1

        if v_idx < num_coords:
            d_start = vertex_distances[v_idx - 1]
            d_end = vertex_distances[v_idx]
            span = d_end - d_start
            frac = (target_dist - d_start) / span if span > 1e-6 else 0.0
            plat, plon = interpolate_coordinate(
                coords[v_idx - 1][1], coords[v_idx - 1][0],
                coords[v_idx][1], coords[v_idx][0],
                frac
            )
            found_coord = (round(plat, 5), round(plon, 5))
        else:
            found_coord = (round(coords[-1][1], 5), round(coords[-1][0], 5))

        frac_of_route = target_dist / total_dist
        eta_seconds = total_duration_sec * frac_of_route
        eta_dt = departure_time + timedelta(seconds=eta_seconds)
        segment_miles = target_dist - prev_sampled_dist
        prev_sampled_dist = target_dist

        checkpoints.append({
            "index": len(checkpoints),
            "lat": found_coord[0],
            "lon": found_coord[1],
            "distance_from_origin_miles": round(target_dist, 1),
            "segment_miles": round(segment_miles, 1),
            "cumulative_duration_seconds": int(eta_seconds),
            "eta_iso": eta_dt.isoformat(),
            "eta_formatted": eta_dt.strftime("%a %b %d, %I:%M %p"),
            "_eta_dt": eta_dt,
        })

    return checkpoints


def _fetch_openrouteservice_hgv(
    lon1: float, lat1: float,
    lon2: float, lat2: float,
    load_weight_lbs: float,
    api_key: str
) -> List[Dict[str, Any]]:
    """
    Query OpenRouteService for Heavy Goods Vehicle (HGV) commercial truck routes.
    Includes truck weight restrictions and generates 3 alternatives.
    """
    cache_key = f"ors_hgv_{lon1}_{lat1}_{lon2}_{lat2}_{int(load_weight_lbs)}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    weight_tons = round(load_weight_lbs * 0.00045359237, 1)

    headers = {
        "Authorization": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json, application/geo+json"
    }

    payload = {
        "coordinates": [[lon1, lat1], [lon2, lat2]],
        "alternative_routes": {
            "target_count": 3,
            "weight_factor": 1.4,
            "share_factor": 0.6
        },
        "options": {
            "profile_params": {
                "weight": weight_tons
            }
        }
    }

    try:
        resp = HTTP_SESSION.post(ORS_API_URL, json=payload, headers=headers, timeout=8)
        if resp.status_code == 200:
            data = resp.json()
            features = data.get("features", [])
            raw_routes = []
            for feat in features:
                coords = feat.get("geometry", {}).get("coordinates", [])
                summary = feat.get("properties", {}).get("summary", {})
                dist_m = summary.get("distance", 0.0)
                dur_s = summary.get("duration", 0.0)
                if coords:
                    raw_routes.append({
                        "geometry": {"coordinates": coords},
                        "distance": dist_m,
                        "duration": dur_s,
                        "provider": "OpenRouteService (HGV Truck Profile)"
                    })
            if raw_routes:
                cache.set(cache_key, raw_routes, timeout=7200)
                return raw_routes
    except Exception:
        pass

    return []


def _fetch_mapbox_routes(
    lon1: float, lat1: float,
    lon2: float, lat2: float,
    access_token: str
) -> List[Dict[str, Any]]:
    """Query Mapbox Directions API for driving routes with alternatives."""
    cache_key = f"mapbox_dir_{lon1}_{lat1}_{lon2}_{lat2}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    url = f"{MAPBOX_DIRECTIONS_URL}/{lon1},{lat1};{lon2},{lat2}"
    params = {
        "alternatives": "true",
        "geometries": "geojson",
        "overview": "full",
        "access_token": access_token
    }

    try:
        resp = HTTP_SESSION.get(url, params=params, timeout=7)
        if resp.status_code == 200:
            data = resp.json()
            routes = data.get("routes", [])
            raw_routes = []
            for r in routes:
                coords = r.get("geometry", {}).get("coordinates", [])
                dist_m = r.get("distance", 0.0)
                dur_s = r.get("duration", 0.0)
                if coords:
                    raw_routes.append({
                        "geometry": {"coordinates": coords},
                        "distance": dist_m,
                        "duration": dur_s,
                        "provider": "Mapbox Directions Engine"
                    })
            if raw_routes:
                cache.set(cache_key, raw_routes, timeout=7200)
                return raw_routes
    except Exception:
        pass

    return []


def _fetch_osrm_route(coords_str: str) -> Optional[Dict[str, Any]]:
    """Query OSRM route API with caching."""
    cache_key = f"osrm_route_{coords_str}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    url = f"{OSRM_ROUTE_URL}/{coords_str}?overview=full&geometries=geojson&steps=false&alternatives=true"
    try:
        resp = HTTP_SESSION.get(url, timeout=7)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("code") == "Ok" and data.get("routes"):
                cache.set(cache_key, data, timeout=7200)
                return data
    except Exception:
        pass

    return None


def is_valid_through_route(
    coords: List[List[float]],
    waypoint_lon: float,
    waypoint_lat: float,
    max_turn_angle_deg: float = 115.0
) -> bool:
    """
    Validates whether a route passing through an intermediate waypoint is a
    legitimate continuous through-highway, or an absurd out-and-back dead-end spur.
    
    Checks:
    1. Turn angle at the snapped waypoint: if incoming and outgoing directions
       form an acute angle (i.e. turn angle > max_turn_angle_deg, e.g. a 140°+ U-turn),
       it's an out-and-back dead end.
    2. Backtracking: whether points after the waypoint retrace paths within ~130m of
       points before the waypoint.
    """
    if not coords or len(coords) < 20:
        return False

    min_dist = float("inf")
    min_idx = 0
    for idx, c in enumerate(coords):
        d = haversine_distance_miles(c[1], c[0], waypoint_lat, waypoint_lon)
        if d < min_dist:
            min_dist = d
            min_idx = idx

    # If the waypoint was snapped near origin or destination, it didn't create a middle spur
    if min_idx < 10 or min_idx > len(coords) - 10:
        return True

    # 1. Check turn angle around the waypoint (look 15 vertices back and ahead)
    stride = min(15, min_idx - 1, len(coords) - 1 - min_idx)
    c_prev = coords[min_idx - stride]
    c_curr = coords[min_idx]
    c_next = coords[min_idx + stride]

    v_in = (c_curr[0] - c_prev[0], c_curr[1] - c_prev[1])
    v_out = (c_next[0] - c_curr[0], c_next[1] - c_curr[1])

    norm_in = math.sqrt(v_in[0] ** 2 + v_in[1] ** 2)
    norm_out = math.sqrt(v_out[0] ** 2 + v_out[1] ** 2)
    if norm_in > 1e-7 and norm_out > 1e-7:
        dot = v_in[0] * v_out[0] + v_in[1] * v_out[1]
        cos_angle = max(-1.0, min(1.0, dot / (norm_in * norm_out)))
        turn_angle = math.acos(cos_angle) * 180.0 / math.pi
        if turn_angle > max_turn_angle_deg:
            return False

    # 2. Check for corridor backtracking (points after waypoint retracing points before waypoint)
    window = min(350, min_idx, len(coords) - min_idx)
    before_sample = coords[min_idx - window : min_idx : 8]
    after_sample = coords[min_idx : min_idx + window : 8]

    overlaps = 0
    for pa in after_sample:
        for pb in before_sample:
            # 0.08 miles is ~130 meters (covers dual carriage highway width + median)
            if haversine_distance_miles(pa[1], pa[0], pb[1], pb[0]) < 0.08:
                overlaps += 1
                break
        if overlaps >= 4:
            return False

    return True


def _generate_synthetic_route(
    origin: Dict[str, float],
    dest: Dict[str, float],
    curvature: float = 0.0,
    speed_mph: float = 58.0
) -> Dict[str, Any]:
    """Generate realistic road geometry fallback."""
    lat1, lon1 = origin["lat"], origin["lon"]
    lat2, lon2 = dest["lat"], dest["lon"]
    straight_miles = haversine_distance_miles(lat1, lon1, lat2, lon2)
    
    road_factor = 1.18 + abs(curvature) * 0.1
    route_miles = straight_miles * road_factor
    duration_sec = (route_miles / speed_mph) * 3600.0

    num_pts = max(60, int(straight_miles / 5.0))
    coords = []
    
    dx = lon2 - lon1
    dy = lat2 - lat1
    perp_x = -dy
    perp_y = dx

    for i in range(num_pts + 1):
        t = i / float(num_pts)
        base_lat, base_lon = interpolate_coordinate(lat1, lon1, lat2, lon2, t)
        envelope = math.sin(t * math.pi)
        lat = base_lat + envelope * curvature * perp_y * 0.35
        lon = base_lon + envelope * curvature * perp_x * 0.35
        coords.append([round(lon, 5), round(lat, 5)])

    return {
        "geometry": {"coordinates": coords},
        "distance": route_miles * MILES_TO_METERS,
        "duration": duration_sec,
        "provider": "Procedural Highway Simulation"
    }


def generate_3_routes(
    origin: Dict[str, float],
    dest: Dict[str, float],
    step_miles: float,
    departure_time: datetime,
    load_weight_lbs: float = 35000.0
) -> List[Dict[str, Any]]:
    """
    Generate 3 distinct route options between origin and destination.
    Uses ORS (Heavy Goods Vehicle) or Mapbox if API keys are configured,
    with automatic seamless fallback to OSRM.
    """
    lon1, lat1 = origin["lon"], origin["lat"]
    lon2, lat2 = dest["lon"], dest.get("dest_lat", dest.get("lat"))

    raw_routes = []
    provider_name = "OSRM (Open Source Routing Machine)"

    # 1. Try OpenRouteService if API key is present
    ors_key = getattr(settings, "ORS_API_KEY", "") or os.environ.get("ORS_API_KEY", "").strip()
    if ors_key:
        ors_routes = _fetch_openrouteservice_hgv(lon1, lat1, lon2, lat2, load_weight_lbs, ors_key)
        if ors_routes:
            raw_routes.extend(ors_routes)
            provider_name = "OpenRouteService (Heavy Goods Vehicle HGV)"

    # 2. Try Mapbox Directions if ORS is not set and Mapbox token is present
    if not raw_routes:
        mb_token = getattr(settings, "MAPBOX_ACCESS_TOKEN", "") or os.environ.get("MAPBOX_ACCESS_TOKEN", "").strip()
        if mb_token:
            mb_routes = _fetch_mapbox_routes(lon1, lat1, lon2, lat2, mb_token)
            if mb_routes:
                raw_routes.extend(mb_routes)
                provider_name = "Mapbox Directions Engine"

    # 3. Fallback to OSRM
    if not raw_routes:
        direct_coords_str = f"{lon1},{lat1};{lon2},{lat2}"
        osrm_data = _fetch_osrm_route(direct_coords_str)
        if osrm_data and "routes" in osrm_data:
            raw_routes.extend(osrm_data["routes"])
            provider_name = "OSRM (Open Source Routing Machine)"

    # If fewer than 3 routes, query intermediate lateral waypoint corridors concurrently
    if len(raw_routes) < 3:
        mid_lat = (lat1 + lat2) / 2.0
        mid_lon = (lon1 + lon2) / 2.0
        d_lat = lat2 - lat1
        d_lon = lon2 - lon1
        perp_lat = -d_lon * 0.18
        perp_lon = d_lat * 0.18

        alt1_lat = round(mid_lat + perp_lat, 4)
        alt1_lon = round(mid_lon + perp_lon, 4)
        alt1_str = f"{lon1},{lat1};{alt1_lon},{alt1_lat};{lon2},{lat2}"

        alt2_lat = round(mid_lat - perp_lat, 4)
        alt2_lon = round(mid_lon - perp_lon, 4)
        alt2_str = f"{lon1},{lat1};{alt2_lon},{alt2_lat};{lon2},{lat2}"

        with ThreadPoolExecutor(max_workers=2) as executor:
            fut1 = executor.submit(_fetch_osrm_route, alt1_str)
            fut2 = executor.submit(_fetch_osrm_route, alt2_str)
            alt1_data = fut1.result()
            alt2_data = fut2.result()

        if alt1_data and "routes" in alt1_data and len(alt1_data["routes"]) > 0:
            cand1 = alt1_data["routes"][0]
            coords1 = cand1.get("geometry", {}).get("coordinates", [])
            # Only accept if it is a genuine through-highway without out-and-back dead-end spurs
            if is_valid_through_route(coords1, alt1_lon, alt1_lat):
                raw_routes.append(cand1)

        if alt2_data and "routes" in alt2_data and len(alt2_data["routes"]) > 0:
            cand2 = alt2_data["routes"][0]
            coords2 = cand2.get("geometry", {}).get("coordinates", [])
            # Only accept if it is a genuine through-highway without out-and-back dead-end spurs
            if is_valid_through_route(coords2, alt2_lon, alt2_lat):
                raw_routes.append(cand2)

    # If still fewer than 3, complete with synthetic road curvature
    if len(raw_routes) < 3:
        curvatures = [0.0, 0.22, -0.22]
        for i in range(len(raw_routes), 3):
            curve = curvatures[i]
            speed = 58.0 - (i * 3.0)
            raw_routes.append(_generate_synthetic_route(origin, dest, curvature=curve, speed_mph=speed))

    raw_routes = raw_routes[:3]

    route_names = [
        ("Route 1", "Primary Interstate Corridor (Direct)"),
        ("Route 2", "Northern / Highway Alternative"),
        ("Route 3", "Southern / Scenic Corridor"),
    ]

    processed_routes = []
    for idx, raw in enumerate(raw_routes):
        geometry = raw.get("geometry", {})
        coords = geometry.get("coordinates", [])
        dist_miles = round(raw.get("distance", 0.0) * METERS_TO_MILES, 1)
        dur_seconds = float(raw.get("duration", 0.0))

        # Checkpoints sampled on exact full-fidelity raw geometry
        checkpoints = sample_polyline_by_distance(
            coords=coords,
            total_duration_sec=dur_seconds,
            step_miles=step_miles,
            departure_time=departure_time
        )

        hours = int(dur_seconds // 3600)
        minutes = int((dur_seconds % 3600) // 60)
        dur_formatted = f"{hours}h {minutes}m"

        short_name, full_name = route_names[idx]

        # Visually simplify polyline coordinates to reduce JSON payload and map SVG memory
        visual_polyline = simplify_polyline_rdp(coords, epsilon=0.0001)

        processed_routes.append({
            "id": f"route_{idx + 1}",
            "route_number": idx + 1,
            "name": short_name,
            "title": full_name,
            "routing_engine": raw.get("provider", provider_name),
            "distance_miles": dist_miles,
            "duration_seconds": int(dur_seconds),
            "duration_formatted": dur_formatted,
            "step_miles": step_miles,
            "polyline": visual_polyline,
            "checkpoints": checkpoints,
        })

    return processed_routes
