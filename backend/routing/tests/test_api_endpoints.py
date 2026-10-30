"""
Integration tests for API endpoints.
Tests /api/health/, /api/routes/presets/, /api/routes/geocode/, and /api/routes/calculate/.
"""

import pytest
from rest_framework.test import APIClient
from django.urls import reverse


@pytest.mark.django_db
class TestAPIEndpoints:

    def setup_method(self):
        self.client = APIClient()

    def test_health_check_endpoint(self):
        response = self.client.get('/api/health/')
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "weather-aware-truck-routing"

    def test_preset_routes_endpoint(self):
        response = self.client.get('/api/routes/presets/')
        assert response.status_code == 200
        data = response.json()
        assert "presets" in data
        assert len(data["presets"]) >= 3

    def test_geocode_autocomplete_endpoint(self):
        response = self.client.get('/api/routes/geocode/?q=Chicago')
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) > 0
        assert "Chicago" in data["results"][0]["name"]

    def test_calculate_routes_endpoint_validation_error(self):
        # Missing required origin & destination
        response = self.client.post('/api/routes/calculate/', {}, format='json')
        assert response.status_code == 400
        data = response.json()
        assert "details" in data
        assert "origin" in data["details"]
        assert "destination" in data["details"]

    def test_calculate_routes_endpoint_success(self):
        payload = {
            "origin": "Chicago, IL",
            "destination": "Denver, CO",
            "departure_time": "2026-11-01T14:00:00Z",
            "load_weight_lbs": 42000,
            "sampling_miles": 50
        }
        response = self.client.post('/api/routes/calculate/', payload, format='json')
        assert response.status_code == 200
        data = response.json()

        assert "recommended_route_id" in data
        assert "routes" in data
        assert len(data["routes"]) == 3
        assert "corridor_forecast_48h" in data
        assert len(data["corridor_forecast_48h"]) > 0

        # Check the first route has checkpoints with weather and risk
        first_route = data["routes"][0]
        assert "checkpoints" in first_route
        assert len(first_route["checkpoints"]) > 0
        cp = first_route["checkpoints"][0]
        assert "weather" in cp
        assert "risk" in cp
        assert "wind_speed_mph" in cp["weather"]
        assert "overall_risk" in cp["risk"]
