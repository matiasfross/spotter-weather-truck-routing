"""
API Views for Weather-Aware Truck Routing.
"""

import re
from datetime import datetime, timezone
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
        "id": "chicago-denver",
        "title": "Chicago, IL → Denver, CO",
        "subtitle": "Cross-Plains High Winds & Mountain Elevation",
        "origin": "Chicago, IL",
        "destination": "Denver, CO",
        "default_weight": 42000,
        "sampling_miles": 25,
        "description": "Crosses the wind corridor of Iowa and Nebraska where winds regularly exceed 35-45 mph."
    },
    {
        "id": "seattle-slc",
        "title": "Seattle, WA → Salt Lake City, UT",
        "subtitle": "Pacific Northwest Winter Pass & Snow Hazards",
        "origin": "Seattle, WA",
        "destination": "Salt Lake City, UT",
        "default_weight": 38000,
        "sampling_miles": 25,
        "description": "Tests mountain passes (Cascades & Blue Mountains) with heavy snow and freezing conditions."
    },
    {
        "id": "dallas-atlanta",
        "title": "Dallas, TX → Atlanta, GA",
        "subtitle": "Southern Interstate Rain & Thunderstorm Front",
        "origin": "Dallas, TX",
        "destination": "Atlanta, GA",
        "default_weight": 28000,
        "sampling_miles": 25,
        "description": "Evaluates heavy rainfall, flash flood risk, and wind speed variations along I-20 corridor."
    },
    {
        "id": "newyork-miami",
        "title": "New York, NY → Miami, FL",
        "subtitle": "East Coast I-95 Long-Haul Logistics",
        "origin": "New York, NY",
        "destination": "Miami, FL",
        "default_weight": 32000,
        "sampling_miles": 50,
        "description": "1,200+ mile corridor demonstrating long-haul sampling and forecast progression."
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

        # Geocode origin
        origin_loc = parse_or_geocode_location(origin_query)
        if not origin_loc:
            return Response(
                {"error": f"Could not locate origin: '{origin_query}'. Please enter a valid city or 'lat,lon'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Geocode destination
        dest_loc = parse_or_geocode_location(dest_query)
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
