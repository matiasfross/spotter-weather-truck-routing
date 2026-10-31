"""
Corridor Weather Heatmap Service.
Generates a spatial corridor grid along the route options with a 0-48 hour forecast timeline.
Uses batch weather fetching for sub-second performance.
"""

import math
from datetime import datetime, timedelta
from typing import List, Dict, Any
from routing.services.risk_service import evaluate_checkpoint_risk
from routing.services.weather_service import fetch_batch_weather, _simulate_weather_point


def generate_corridor_mesh(routes: List[Dict[str, Any]], max_points: int = 25) -> List[Dict[str, float]]:
    """
    Extract a spatial corridor mesh covering all routes plus lateral buffer offsets.
    """
    sampled_coords = []
    seen = set()

    # Collect coordinates along routes
    for r in routes:
        cps = r.get("checkpoints", [])
        step = max(1, len(cps) // 6)
        for i in range(0, len(cps), step):
            pt = cps[i]
            coord_key = (round(pt["lat"], 2), round(pt["lon"], 2))
            if coord_key not in seen:
                seen.add(coord_key)
                sampled_coords.append({"lat": pt["lat"], "lon": pt["lon"]})

    # Add lateral buffer points (~25 miles offset)
    buffer_points = []
    for i in range(1, len(sampled_coords) - 1, 2):
        prev = sampled_coords[i - 1]
        curr = sampled_coords[i]
        nxt = sampled_coords[i + 1]

        dlat = nxt["lat"] - prev["lat"]
        dlon = nxt["lon"] - prev["lon"]
        length = math.sqrt(dlat * dlat + dlon * dlon)
        if length > 0.001:
            offset = 0.35  # ~24 miles
            norm_lat = -dlon / length * offset
            norm_lon = dlat / length * offset

            left_pt = {"lat": round(curr["lat"] + norm_lat, 4), "lon": round(curr["lon"] + norm_lon, 4)}
            right_pt = {"lat": round(curr["lat"] - norm_lat, 4), "lon": round(curr["lon"] - norm_lon, 4)}

            buffer_points.append(left_pt)
            buffer_points.append(right_pt)

    all_points = sampled_coords + buffer_points
    unique_points = []
    final_seen = set()
    for pt in all_points:
        k = (round(pt["lat"], 2), round(pt["lon"], 2))
        if k not in final_seen:
            final_seen.add(k)
            unique_points.append(pt)
        if len(unique_points) >= max_points:
            break

    return unique_points


def build_corridor_48h_forecast(
    routes: List[Dict[str, Any]],
    departure_time: datetime,
    load_weight_lbs: float
) -> List[Dict[str, Any]]:
    """
    Build 48-hour hourly timeline for each corridor point.
    Batches API requests for instant response.
    """
    grid = generate_corridor_mesh(routes, max_points=25)
    if not grid:
        return []

    # Batch fetch all weather timeseries in 1 request
    batch_weather = fetch_batch_weather(grid)

    corridor_data = []

    for idx, pt in enumerate(grid):
        lat = pt["lat"]
        lon = pt["lon"]
        ts_data = batch_weather[idx] if idx < len(batch_weather) else None

        hourly = ts_data.get("hourly", {}) if ts_data else {}
        times = hourly.get("time", [])
        time_map = {t: i for i, t in enumerate(times)} if times else {}

        timeline = []
        for hour_offset in range(0, 49):  # 0 to 48 hours
            target_dt = departure_time + timedelta(hours=hour_offset)
            target_str = target_dt.strftime("%Y-%m-%dT%H:00")
            h_idx = time_map.get(target_str)

            if h_idx is not None:
                wind_mph = float(hourly.get("wind_speed_10m", [0.0])[h_idx] or 0.0)
                rain_in = float(hourly.get("rain", hourly.get("precipitation", [0.0]))[h_idx] or 0.0)
                snow_in = float(hourly.get("snowfall", [0.0])[h_idx] or 0.0)
                temp_f = float(hourly.get("temperature_2m", [60.0])[h_idx] or 60.0)
            else:
                sim = _simulate_weather_point(lat, lon, target_dt)
                wind_mph = sim["wind_speed_mph"]
                rain_in = sim["rain_in_hr"]
                snow_in = sim["snow_in_hr"]
                temp_f = sim["temperature_f"]

            # Evaluate risk at this point for truck weight strictly per PDF rules
            risk = evaluate_checkpoint_risk(wind_mph, rain_in, snow_in, load_weight_lbs)
            score = risk["overall_risk_score"]
            if score <= 1:
                intensity = 0.0
            elif score == 2:
                intensity = 0.35
            elif score == 3:
                intensity = 0.65
            elif score == 4:
                intensity = 0.85
            else:
                intensity = 1.0

            timeline.append({
                "hour_offset": hour_offset,
                "time_iso": target_dt.isoformat(),
                "time_formatted": target_dt.strftime("%a %I:%M %p"),
                "wind_mph": round(wind_mph, 1),
                "rain_in_hr": round(rain_in, 2),
                "snow_in_hr": round(snow_in, 2),
                "temp_f": round(temp_f, 1),
                "risk_score": score,
                "risk_level": risk["overall_risk"],
                "color": risk["color"],
                "intensity": round(intensity, 2),
            })

        corridor_data.append({
            "id": idx + 1,
            "lat": lat,
            "lon": lon,
            "timeline": timeline,
        })

    return corridor_data
