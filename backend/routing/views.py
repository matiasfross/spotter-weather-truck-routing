"""
API Views for Weather-Aware Truck Routing.
"""

import re
import requests
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from django.http import HttpResponse
from django.conf import settings
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from routing.serializers import RouteCalculateRequestSerializer, GeocodeSearchSerializer
from routing.services.geocoding_service import geocode_address, search_places
from routing.services.routing_service import generate_3_routes
from routing.services.recommendation_service import (
    enrich_routes_with_weather_and_risk,
    select_best_route
)
from routing.services.corridor_service import build_corridor_48h_forecast

PRESET_ROUTES = [
    {
        "id": "miami-tampa-severe-rain",
        "title": "Miami, FL → Tampa, FL",
        "subtitle": "🔴 Lluvia Torrencial & NO TRAVEL (>0.75 in/hr)",
        "origin": "Miami, FL",
        "destination": "Tampa, FL",
        "default_weight": 35000,
        "sampling_miles": 25,
        "departure_offset_hours": 7,
        "description": "Prueba de detención obligatoria (NO TRAVEL) por precipitación extrema (0.89 in/hr) e inundación repentina."
    },
    {
        "id": "cheyenne-slc-extreme-wind",
        "title": "Cheyenne, WY → Salt Lake City, UT",
        "subtitle": "🔴 Ráfagas 48 mph & NO TRAVEL por Peso",
        "origin": "Cheyenne, WY",
        "destination": "Salt Lake City, UT",
        "default_weight": 48000,
        "sampling_miles": 25,
        "departure_offset_hours": 64,
        "description": "Prueba de vuelco por viento cruzado en corredor I-80 con camión pesado (>30,000 lbs)."
    },
    {
        "id": "chicago-omaha-rain-front",
        "title": "Chicago, IL → Omaha, NE",
        "subtitle": "🟠 Desempate de Rutas por Frente de Lluvia",
        "origin": "Chicago, IL",
        "destination": "Omaha, NE",
        "default_weight": 38000,
        "sampling_miles": 25,
        "departure_offset_hours": 1,
        "description": "Demuestra la selección de ruta por menores millas de alto riesgo (Tier 2)."
    },
    {
        "id": "denver-grandjunction-rockies",
        "title": "Denver, CO → Grand Junction, CO",
        "subtitle": "❄️ Paso de Montaña & Gran Altitud (I-70)",
        "origin": "Denver, CO",
        "destination": "Grand Junction, CO",
        "default_weight": 42000,
        "sampling_miles": 10,
        "departure_offset_hours": 0,
        "description": "Prueba de corredor montañoso de gran elevación (11,000+ ft) y pendientes extremas."
    }
]


def parse_or_geocode_location(text: str):
    """Parse coordinate string 'lat,lon' or geocode address text."""
    coord_match = re.match(r"^([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)$", text.strip())
    if coord_match:
        lat = float(coord_match.group(1))
        lon = float(coord_match.group(2))
        return {"name": f"Coordinate ({lat:.4f}, {lon:.4f})", "lat": lat, "lon": lon}
    
    geo = geocode_address(text)
    if geo:
        return geo
    return None


class CalculateRoutesAPIView(APIView):
    """
    POST /api/routes/calculate/
    Generates 3 routes, samples weather every 10/25/50 miles, evaluates risk with load rules,
    and returns route recommendations + 0-48h corridor forecast heatmap data.
    """

    def post(self, request):
        serializer = RouteCalculateRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": "Validation failed", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        origin_query = data["origin"]
        dest_query = data["destination"]
        dep_time = data.get("departure_time") or datetime.now(timezone.utc)
        load_weight = data.get("load_weight_lbs", 35000.0)
        sampling_miles = float(data.get("sampling_miles", 25))

        # Geocode origin & destination in parallel
        with ThreadPoolExecutor(max_workers=2) as executor:
            fut_orig = executor.submit(parse_or_geocode_location, origin_query)
            fut_dest = executor.submit(parse_or_geocode_location, dest_query)
            origin_loc = fut_orig.result()
            dest_loc = fut_dest.result()

        if not origin_loc:
            return Response(
                {"error": f"Could not locate origin: '{origin_query}'. Please enter a valid city or 'lat,lon'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not dest_loc:
            return Response(
                {"error": f"Could not locate destination: '{dest_query}'. Please enter a valid city or 'lat,lon'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate 3 routes
        raw_routes = generate_3_routes(
            origin=origin_loc,
            dest=dest_loc,
            step_miles=sampling_miles,
            departure_time=dep_time,
            load_weight_lbs=load_weight
        )

        if not raw_routes:
            return Response(
                {"error": "Failed to calculate routes between origin and destination."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Enrich each route and checkpoint with weather and risk
        enriched_routes = enrich_routes_with_weather_and_risk(raw_routes, load_weight)

        # Select best route according to preference hierarchy
        recommendation = select_best_route(enriched_routes)

        # Build corridor 48-hour heatmap forecast
        corridor_heatmap = build_corridor_48h_forecast(
            routes=enriched_routes,
            departure_time=dep_time,
            load_weight_lbs=load_weight
        )

        response_payload = {
            "origin": origin_loc,
            "destination": dest_loc,
            "departure_time": dep_time.isoformat(),
            "departure_time_formatted": dep_time.strftime("%a %b %d, %Y - %I:%M %p UTC"),
            "load_weight_lbs": load_weight,
            "sampling_miles": int(sampling_miles),
            "recommended_route_id": recommendation.get("recommended_route_id"),
            "recommended_route_name": recommendation.get("recommended_route_name"),
            "recommendation_summary": recommendation.get("summary"),
            "routes": recommendation.get("routes", []),
            "corridor_forecast_48h": corridor_heatmap,
            "risk_rules_reference": {
                "wind_thresholds": "<25 mph (Low), 25-34 (Mod), 35-44 (High), 45-54 (Severe), >=55 (No Travel)",
                "load_wind_rules": ">=55 mph: No Travel; 45-54 mph + >30,000 lb: No Travel; 35-44 mph + >40,000 lb: Severe",
                "rain_thresholds": "<0.10 in/hr (Low), 0.10-0.25 (Mod), 0.25-0.50 (High), 0.50-1.00 (Severe), >1.00 (No Travel)",
                "snow_thresholds": "<0.5 in/hr (Low), 0.5-1.0 (Mod), 1.0-2.0 (High), 2.0-3.0 (Severe), >3.0 (No Travel)",
            }
        }

        return Response(response_payload, status=status.HTTP_200_OK)


class GeocodeSearchAPIView(APIView):
    """
    GET /api/routes/geocode/?q=Denver
    Autocomplete search for cities and logistics hubs.
    """

    def get(self, request):
        serializer = GeocodeSearchSerializer(data=request.query_params)
        if not serializer.is_valid():
            return Response({"error": "Invalid query", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        q = serializer.validated_data["q"]
        limit = serializer.validated_data.get("limit", 5)
        places = search_places(q, limit)
        return Response({"results": places}, status=status.HTTP_200_OK)


class PresetRoutesAPIView(APIView):
    """
    GET /api/routes/presets/
    Returns list of curated test routes for quick 1-click evaluation.
    """

    def get(self, request):
        return Response({"presets": PRESET_ROUTES}, status=status.HTTP_200_OK)


# 1x1 Transparent PNG byte string fallback
TRANSPARENT_1X1_PNG = (
    b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
    b'\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00'
    b'\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
)


class RadarTileProxyAPIView(APIView):
    """
    GET /api/routes/radar-tile/<str:layer>/<int:z>/<int:x>/<int:y>.png
    Zero-Secrets Frontend Proxy:
    Securely serves OpenWeatherMap radar tiles using server-side OPENWEATHER_API_KEY.
    Caches image tiles for 10 minutes to minimize external calls and bandwidth.
    """

    def get(self, request, layer: str, z: int, x: int, y: int):
        # Validate layer name to prevent path traversal or SSRF
        allowed_layers = {"precipitation_new", "clouds_new", "wind_new", "temp_new"}
        if layer not in allowed_layers:
            return HttpResponse(TRANSPARENT_1X1_PNG, content_type="image/png")

        # Validate tile zoom bounds
        if not (0 <= z <= 18) or x < 0 or y < 0:
            return HttpResponse(TRANSPARENT_1X1_PNG, content_type="image/png")

        api_key = getattr(settings, "OPENWEATHER_API_KEY", "") or ""
        if not api_key:
            # If no API key configured on server, return transparent tile safely
            return HttpResponse(TRANSPARENT_1X1_PNG, content_type="image/png")

        cache_key = f"radar_tile_{layer}_{z}_{x}_{y}"
        cached_tile = cache.get(cache_key)
        if cached_tile:
            resp = HttpResponse(cached_tile, content_type="image/png")
            resp["Cache-Control"] = "public, max-age=600"
            resp["X-Tile-Cache"] = "HIT"
            return resp

        # Fetch from OpenWeatherMap securely server-side
        url = f"https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png"
        try:
            r = requests.get(url, params={"appid": api_key}, timeout=5)
            if r.status_code == 200 and r.content:
                cache.set(cache_key, r.content, timeout=600)
                resp = HttpResponse(r.content, content_type="image/png")
                resp["Cache-Control"] = "public, max-age=600"
                resp["X-Tile-Cache"] = "MISS"
                return resp
        except Exception:
            pass

        return HttpResponse(TRANSPARENT_1X1_PNG, content_type="image/png")

