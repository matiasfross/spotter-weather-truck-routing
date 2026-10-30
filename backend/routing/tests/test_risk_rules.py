"""
Unit tests for the Risk Calculation Service.
Validates all risk thresholds and load weight rules strictly against requirements.
"""

import pytest
from routing.services.risk_service import (
    RiskLevel,
    classify_wind_speed,
    classify_rain,
    classify_snow,
    evaluate_checkpoint_risk,
)


class TestRiskRules:
    """Test standard weather classification thresholds."""

    def test_wind_thresholds_empty_load(self):
        # < 25 mph -> Low
        assert classify_wind_speed(0.0, 10000)[0] == RiskLevel.LOW
        assert classify_wind_speed(24.9, 10000)[0] == RiskLevel.LOW
        
        # 25–34 mph -> Moderate
        assert classify_wind_speed(25.0, 10000)[0] == RiskLevel.MODERATE
        assert classify_wind_speed(34.0, 10000)[0] == RiskLevel.MODERATE
        
        # 35–44 mph -> High
        assert classify_wind_speed(35.0, 10000)[0] == RiskLevel.HIGH
        assert classify_wind_speed(44.0, 10000)[0] == RiskLevel.HIGH
        
        # 45–54 mph -> Severe
        assert classify_wind_speed(45.0, 10000)[0] == RiskLevel.SEVERE
        assert classify_wind_speed(54.0, 10000)[0] == RiskLevel.SEVERE
        
        # ≥ 55 mph -> No Travel
        assert classify_wind_speed(55.0, 10000)[0] == RiskLevel.NO_TRAVEL
        assert classify_wind_speed(65.0, 10000)[0] == RiskLevel.NO_TRAVEL

    def test_rain_thresholds(self):
        # < 0.10 in/hr -> Low
        assert classify_rain(0.0)[0] == RiskLevel.LOW
        assert classify_rain(0.09)[0] == RiskLevel.LOW
        
        # 0.10–0.25 in/hr -> Moderate
        assert classify_rain(0.10)[0] == RiskLevel.MODERATE
        assert classify_rain(0.24)[0] == RiskLevel.MODERATE
        
        # 0.25–0.50 in/hr -> High
        assert classify_rain(0.25)[0] == RiskLevel.HIGH
        assert classify_rain(0.49)[0] == RiskLevel.HIGH
        
        # 0.50–1.00 in/hr -> Severe
        assert classify_rain(0.50)[0] == RiskLevel.SEVERE
        assert classify_rain(1.00)[0] == RiskLevel.SEVERE
        
        # > 1.00 in/hr -> No Travel
        assert classify_rain(1.01)[0] == RiskLevel.NO_TRAVEL
        assert classify_rain(2.50)[0] == RiskLevel.NO_TRAVEL

    def test_snow_thresholds(self):
        # < 0.5 in/hr -> Low
        assert classify_snow(0.0)[0] == RiskLevel.LOW
        assert classify_snow(0.49)[0] == RiskLevel.LOW
        
        # 0.5–1.0 in/hr -> Moderate
        assert classify_snow(0.5)[0] == RiskLevel.MODERATE
        assert classify_snow(0.99)[0] == RiskLevel.MODERATE
        
        # 1.0–2.0 in/hr -> High
        assert classify_snow(1.0)[0] == RiskLevel.HIGH
        assert classify_snow(1.99)[0] == RiskLevel.HIGH
        
        # 2.0–3.0 in/hr -> Severe
        assert classify_snow(2.0)[0] == RiskLevel.SEVERE
        assert classify_snow(3.0)[0] == RiskLevel.SEVERE
        
        # > 3.0 in/hr -> No Travel
        assert classify_snow(3.01)[0] == RiskLevel.NO_TRAVEL
        assert classify_snow(4.50)[0] == RiskLevel.NO_TRAVEL


class TestLoadRules:
    """
    Test load rules strictly per specification:
      • ≥55 mph → No Travel for any load
      • 45–54 mph + >30,000 lb → No Travel
      • 35–44 mph + >40,000 lb → Severe
    """

    def test_wind_55_plus_no_travel_for_any_load(self):
        # Empty truck (0 lb)
        risk, _ = classify_wind_speed(55.0, 0)
        assert risk == RiskLevel.NO_TRAVEL

        # Standard truck (20,000 lb)
        risk, _ = classify_wind_speed(58.0, 20000)
        assert risk == RiskLevel.NO_TRAVEL

        # Very heavy truck (45,000 lb)
        risk, _ = classify_wind_speed(60.0, 45000)
        assert risk == RiskLevel.NO_TRAVEL

    def test_wind_45_to_54_with_load_rule(self):
        # ≤ 30,000 lb -> stays Severe
        risk, _ = classify_wind_speed(48.0, 30000)
        assert risk == RiskLevel.SEVERE

        risk, _ = classify_wind_speed(50.0, 25000)
        assert risk == RiskLevel.SEVERE

        # > 30,000 lb -> escalated to No Travel
        risk, reasons = classify_wind_speed(48.0, 30001)
        assert risk == RiskLevel.NO_TRAVEL
        assert any("NO TRAVEL" in r for r in reasons)

        risk, _ = classify_wind_speed(52.0, 42000)
        assert risk == RiskLevel.NO_TRAVEL

    def test_wind_35_to_44_with_load_rule(self):
        # ≤ 40,000 lb -> stays High
        risk, _ = classify_wind_speed(40.0, 40000)
        assert risk == RiskLevel.HIGH

        risk, _ = classify_wind_speed(38.0, 35000)
        assert risk == RiskLevel.HIGH

        # > 40,000 lb -> escalated to Severe
        risk, reasons = classify_wind_speed(40.0, 40001)
        assert risk == RiskLevel.SEVERE
        assert any("SEVERE" in r for r in reasons)

        risk, _ = classify_wind_speed(36.0, 45000)
        assert risk == RiskLevel.SEVERE


class TestCompositeCheckpointRisk:
    """Test composite checkpoint risk evaluation (maximum across conditions)."""

    def test_overall_risk_takes_maximum(self):
        # Wind is Moderate (28 mph), Rain is Severe (0.60 in/hr), Snow is Low (0 in/hr)
        result = evaluate_checkpoint_risk(
            wind_mph=28.0,
            rain_in_hr=0.60,
            snow_in_hr=0.0,
            load_weight_lbs=20000
        )
        assert result["overall_risk"] == "SEVERE"
        assert result["overall_risk_score"] == 4
        assert not result["is_no_travel"]

    def test_torrential_rain_triggers_no_travel(self):
        result = evaluate_checkpoint_risk(
            wind_mph=15.0,
            rain_in_hr=1.20,
            snow_in_hr=0.0,
            load_weight_lbs=20000
        )
        assert result["overall_risk"] == "NO_TRAVEL"
        assert result["overall_risk_score"] == 5
        assert result["is_no_travel"]

    def test_heavy_load_wind_escalation_in_composite(self):
        # 38 mph wind with 45,000 lb load should escalate from High to Severe
        result = evaluate_checkpoint_risk(
            wind_mph=38.0,
            rain_in_hr=0.0,
            snow_in_hr=0.0,
            load_weight_lbs=45000
        )
        assert result["overall_risk"] == "SEVERE"
        assert result["load_rule_applied"] is True
