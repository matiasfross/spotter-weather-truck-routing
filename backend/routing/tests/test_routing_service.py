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
    is_valid_through_route,
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

    def test_is_valid_through_route_spur_detection(self):
        # A route that goes from (0,0) to (0,1), branches to (0.5, 1) and turns back to (0,1) and continues to (0,2)
        # Legitimate through route:
        clean_coords = [[-104.0 + i * 0.1, 40.0] for i in range(30)]
        assert is_valid_through_route(clean_coords, -102.5, 40.0) is True

        # Dead-end spur: travels to waypoint, turns 180° around, and retraces
        spur_coords = []
        for i in range(15):
            spur_coords.append([-104.0 + i * 0.05, 40.0])  # heading east
        for i in range(15):
            spur_coords.append([-103.25, 40.0 + i * 0.05]) # heading north up spur
        # waypoint at [-103.25, 40.7]
        for i in range(15):
            spur_coords.append([-103.25, 40.7 - i * 0.05]) # heading south down spur (retrace!)
        for i in range(15):
            spur_coords.append([-103.25 + i * 0.05, 40.0]) # resume east

        assert is_valid_through_route(spur_coords, -103.25, 40.7) is False

    def test_denver_grand_junction_no_absurd_detours(self):
        origin = {"name": "Denver, CO", "lat": 39.7392, "lon": -104.9903}
        dest = {"name": "Grand Junction, CO", "lat": 39.0639, "lon": -108.5506}
        dep_time = datetime(2026, 11, 1, 10, 0, 0, tzinfo=timezone.utc)

        routes = generate_3_routes(origin, dest, step_miles=10.0, departure_time=dep_time)
        assert len(routes) in (2, 3)
        assert all("Procedural" not in r["routing_engine"] for r in routes)

        # Route 1: Primary Interstate (I-70 direct)
        assert "Interstate" in routes[0]["title"]
        assert 240.0 < routes[0]["distance_miles"] < 255.0

        # Route 2: Real Federal Highway (US-40 or US-50/285 bypass)
        r2 = routes[1]
        assert "Federal Highway" in r2["title"]
        assert r2["distance_miles"] > 350.0  # Bypass route around the central mountain spine

        # Verify that all returned routes have zero out-and-back retracing (no dead-end spurs)
        for r in routes:
            coords = r["polyline"]
            retrace_count = 0
            for i in range(0, len(coords), 10):
                for j in range(i + 40, len(coords), 10):
                    dist = haversine_distance_miles(coords[i][1], coords[i][0], coords[j][1], coords[j][0])
                    if dist < 0.05:
                        retrace_count += 1
            assert retrace_count == 0

    def test_corridor_mesh_strictly_on_routes(self):
        from routing.services.corridor_service import generate_corridor_mesh
        mock_routes = [
            {
                "id": "route_1",
                "checkpoints": [
                    {"lat": 41.8781, "lon": -87.6298},
                    {"lat": 41.5236, "lon": -90.5776},
                    {"lat": 41.2565, "lon": -95.9345},
                ]
            }
        ]
        mesh = generate_corridor_mesh(mock_routes, max_points=10)
        assert len(mesh) == 3
        # All points must be directly from route checkpoints (no lateral offsets in fields)
        expected_coords = {(round(cp["lat"], 5), round(cp["lon"], 5)) for cp in mock_routes[0]["checkpoints"]}
        for pt in mesh:
            assert (pt["lat"], pt["lon"]) in expected_coords
            assert pt["route_id"] == "route_1"
