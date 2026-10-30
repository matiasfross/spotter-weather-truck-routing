"""
Unit tests for the Routing Service.
Validates polyline distance sampling (10, 25, 50 miles) and 3-route generation.
"""

from datetime import datetime, timezone
import pytest
from routing.services.routing_service import (
    haversine_distance_miles,
    sample_polyline_by_distance,
    generate_3_routes,
)


class TestRoutingService:

    def test_haversine_distance(self):
        # Chicago to Denver is approximately 920-950 direct miles
        chicago = (41.8781, -87.6298)
        denver = (39.7392, -104.9903)
        dist = haversine_distance_miles(chicago[0], chicago[1], denver[0], denver[1])
        assert 900.0 < dist < 950.0

    def test_sampling_intervals_10_25_50(self):
        # Simple straight route between two points ~100 miles apart
        # 1 deg lat is ~69 miles, 1.45 deg is ~100 miles
        p1 = [-87.6298, 41.8781]
        p2 = [-87.6298, 43.3281]
        coords = [p1, p2]
        total_duration = 7200.0  # 2 hours
        dep_time = datetime(2026, 11, 1, 10, 0, 0, tzinfo=timezone.utc)

        # Sample every 25 miles
        cps_25 = sample_polyline_by_distance(coords, total_duration, 25.0, dep_time)
        assert len(cps_25) >= 4  # 0, 25, 50, 75, 100
        assert cps_25[0]["distance_from_origin_miles"] == 0.0
        assert cps_25[-1]["distance_from_origin_miles"] > 95.0
        # Check ETA progression
        assert cps_25[0]["cumulative_duration_seconds"] == 0
        assert cps_25[-1]["cumulative_duration_seconds"] == int(total_duration)

        # Sample every 50 miles
        cps_50 = sample_polyline_by_distance(coords, total_duration, 50.0, dep_time)
        assert len(cps_50) >= 3  # 0, 50, 100
        assert len(cps_50) < len(cps_25)

        # Sample every 10 miles
        cps_10 = sample_polyline_by_distance(coords, total_duration, 10.0, dep_time)
        assert len(cps_10) >= 10
        assert len(cps_10) > len(cps_25)

    def test_guaranteed_3_routes(self):
        origin = {"name": "Chicago, IL", "lat": 41.8781, "lon": -87.6298}
        dest = {"name": "Denver, CO", "lat": 39.7392, "lon": -104.9903}
        dep_time = datetime(2026, 11, 1, 10, 0, 0, tzinfo=timezone.utc)

        routes = generate_3_routes(origin, dest, step_miles=50.0, departure_time=dep_time)
        assert len(routes) == 3
        
        # Verify route properties
        for r in routes:
            assert "id" in r
            assert "name" in r
            assert "distance_miles" in r
            assert r["distance_miles"] > 500.0  # Realistic distance
            assert "duration_seconds" in r
            assert "checkpoints" in r
            assert len(r["checkpoints"]) > 5
