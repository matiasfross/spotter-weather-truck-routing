"""
Unit tests for the Recommendation Hierarchy.
Strictly validates:
  1. Fewest Severe miles
  2. Fewest High miles
  3. Lowest average risk
  4. Shortest travel times
"""

import pytest
from routing.services.recommendation_service import select_best_route


class TestRecommendationHierarchy:

    def test_priority_1_fewest_severe_miles(self):
        # Route A has 0 severe miles but longer travel time (10h)
        # Route B has 50 severe miles but faster travel time (8h)
        route_a = {
            "id": "route_a",
            "name": "Route A",
            "duration_seconds": 36000,
            "risk_summary": {
                "severe_and_worse_miles": 0.0,
                "severe_miles": 0.0,
                "high_miles": 100.0,
                "average_risk_score": 2.5,
                "has_no_travel": False,
                "load_rule_trigger_count": 0,
            }
        }
        route_b = {
            "id": "route_b",
            "name": "Route B",
            "duration_seconds": 28800,
            "risk_summary": {
                "severe_and_worse_miles": 50.0,
                "severe_miles": 50.0,
                "high_miles": 0.0,
                "average_risk_score": 2.0,
                "has_no_travel": False,
                "load_rule_trigger_count": 0,
            }
        }

        result = select_best_route([route_b, route_a])
        assert result["recommended_route_id"] == "route_a"

    def test_priority_2_fewest_high_miles_when_severe_tied(self):
        # Both have 0 severe miles
        # Route A has 25 high miles
        # Route B has 75 high miles
        route_a = {
            "id": "route_a",
            "name": "Route A",
            "duration_seconds": 36000,
            "risk_summary": {
                "severe_and_worse_miles": 0.0,
                "severe_miles": 0.0,
                "high_miles": 25.0,
                "average_risk_score": 2.2,
                "has_no_travel": False,
                "load_rule_trigger_count": 0,
            }
        }
        route_b = {
            "id": "route_b",
            "name": "Route B",
            "duration_seconds": 30000,
            "risk_summary": {
                "severe_and_worse_miles": 0.0,
                "severe_miles": 0.0,
                "high_miles": 75.0,
                "average_risk_score": 2.1,
                "has_no_travel": False,
                "load_rule_trigger_count": 0,
            }
        }

        result = select_best_route([route_b, route_a])
        assert result["recommended_route_id"] == "route_a"

    def test_priority_3_lowest_average_risk_when_severe_and_high_tied(self):
        # Both have 0 severe miles and 0 high miles
        # Route A has lower average risk (1.2 vs 1.8)
        route_a = {
            "id": "route_a",
            "name": "Route A",
            "duration_seconds": 36000,
            "risk_summary": {
                "severe_and_worse_miles": 0.0,
                "severe_miles": 0.0,
                "high_miles": 0.0,
                "average_risk_score": 1.2,
                "has_no_travel": False,
                "load_rule_trigger_count": 0,
            }
        }
        route_b = {
            "id": "route_b",
            "name": "Route B",
            "duration_seconds": 32000,
            "risk_summary": {
                "severe_and_worse_miles": 0.0,
                "severe_miles": 0.0,
                "high_miles": 0.0,
                "average_risk_score": 1.8,
                "has_no_travel": False,
                "load_rule_trigger_count": 0,
            }
        }

        result = select_best_route([route_b, route_a])
        assert result["recommended_route_id"] == "route_a"

    def test_priority_4_shortest_time_when_risks_tied(self):
        # Equal risk profiles
        # Route A takes 6 hours (21600s), Route B takes 7 hours (25200s)
        route_a = {
            "id": "route_a",
            "name": "Route A",
            "duration_seconds": 21600,
            "risk_summary": {
                "severe_and_worse_miles": 0.0,
                "severe_miles": 0.0,
                "high_miles": 0.0,
                "average_risk_score": 1.1,
                "has_no_travel": False,
                "load_rule_trigger_count": 0,
            }
        }
        route_b = {
            "id": "route_b",
            "name": "Route B",
            "duration_seconds": 25200,
            "risk_summary": {
                "severe_and_worse_miles": 0.0,
                "severe_miles": 0.0,
                "high_miles": 0.0,
                "average_risk_score": 1.1,
                "has_no_travel": False,
                "load_rule_trigger_count": 0,
            }
        }

        result = select_best_route([route_b, route_a])
        assert result["recommended_route_id"] == "route_a"
