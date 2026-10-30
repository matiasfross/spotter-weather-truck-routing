"""
Risk Calculation Service for Weather-Aware Truck Routing.
Implements the exact risk thresholds and load weight rules specified in the requirements.
"""

from enum import IntEnum
from typing import Dict, Any, List, Tuple


class RiskLevel(IntEnum):
    LOW = 1
    MODERATE = 2
    HIGH = 3
    SEVERE = 4
    NO_TRAVEL = 5

    @property
    def label(self) -> str:
        return {
            RiskLevel.LOW: "Low",
            RiskLevel.MODERATE: "Moderate",
            RiskLevel.HIGH: "High",
            RiskLevel.SEVERE: "Severe",
            RiskLevel.NO_TRAVEL: "No Travel"
        }[self]

    @property
    def color(self) -> str:
        """Hex color code for UI rendering."""
        return {
            RiskLevel.LOW: "#10b981",       # Green
            RiskLevel.MODERATE: "#f59e0b",  # Amber/Yellow
            RiskLevel.HIGH: "#f97316",      # Orange
            RiskLevel.SEVERE: "#ef4444",    # Red
            RiskLevel.NO_TRAVEL: "#7f1d1d"  # Dark Red/Maroon
        }[self]


def classify_wind_speed(wind_mph: float, load_weight_lbs: float) -> Tuple[RiskLevel, List[str]]:
    """
    Classify wind speed risk taking truck load weight into account according to rules:
    Base wind thresholds:
      - < 25 mph: Low
      - 25–34 mph: Moderate
      - 35–44 mph: High
      - 45–54 mph: Severe
      - ≥ 55 mph: No Travel
    
    Load rules:
      - ≥ 55 mph -> No Travel for any load
      - 45–54 mph + >30,000 lb -> No Travel
      - 35–44 mph + >40,000 lb -> Severe
    """
    reasons = []

    if wind_mph >= 55.0:
        reasons.append(f"Extreme wind ({wind_mph:.1f} mph ≥ 55 mph) triggers mandatory NO TRAVEL for all vehicles.")
        return RiskLevel.NO_TRAVEL, reasons

    if 45.0 <= wind_mph < 55.0:
        if load_weight_lbs > 30000.0:
            reasons.append(
                f"High crosswind ({wind_mph:.1f} mph) with heavy load ({load_weight_lbs:,.0f} lb > 30,000 lb) "
                f"escalates risk to NO TRAVEL."
            )
            return RiskLevel.NO_TRAVEL, reasons
        else:
            reasons.append(f"Severe wind ({wind_mph:.1f} mph). Truck weight {load_weight_lbs:,.0f} lb ≤ 30,000 lb.")
            return RiskLevel.SEVERE, reasons

    if 35.0 <= wind_mph < 45.0:
        if load_weight_lbs > 40000.0:
            reasons.append(
                f"Elevated wind ({wind_mph:.1f} mph) with very heavy load ({load_weight_lbs:,.0f} lb > 40,000 lb) "
                f"escalates risk from High to SEVERE."
            )
            return RiskLevel.SEVERE, reasons
        else:
            reasons.append(f"High wind ({wind_mph:.1f} mph). Truck weight {load_weight_lbs:,.0f} lb ≤ 40,000 lb.")
            return RiskLevel.HIGH, reasons

    if 25.0 <= wind_mph < 35.0:
        reasons.append(f"Moderate wind ({wind_mph:.1f} mph).")
        return RiskLevel.MODERATE, reasons

    return RiskLevel.LOW, reasons


def classify_rain(rain_in_hr: float) -> Tuple[RiskLevel, List[str]]:
    """
    Classify rain risk using thresholds (in/hr):
      - < 0.10: Low
      - 0.10–0.25: Moderate
      - 0.25–0.50: High
      - 0.50–1.00: Severe
      - > 1.00: No Travel
    """
    reasons = []
    if rain_in_hr > 1.00:
        reasons.append(f"Flash flood / torrential rain rate ({rain_in_hr:.2f} in/hr > 1.00 in/hr) triggers NO TRAVEL.")
        return RiskLevel.NO_TRAVEL, reasons
    if rain_in_hr >= 0.50:
        reasons.append(f"Severe downpour ({rain_in_hr:.2f} in/hr in 0.50–1.00 in/hr).")
        return RiskLevel.SEVERE, reasons
    if rain_in_hr >= 0.25:
        reasons.append(f"Heavy rain ({rain_in_hr:.2f} in/hr in 0.25–0.50 in/hr).")
        return RiskLevel.HIGH, reasons
    if rain_in_hr >= 0.10:
        reasons.append(f"Moderate rain ({rain_in_hr:.2f} in/hr in 0.10–0.25 in/hr).")
        return RiskLevel.MODERATE, reasons
    return RiskLevel.LOW, reasons


def classify_snow(snow_in_hr: float) -> Tuple[RiskLevel, List[str]]:
    """
    Classify snow risk using thresholds (in/hr):
      - < 0.5: Low
      - 0.5–1.0: Moderate
      - 1.0–2.0: High
      - 2.0–3.0: Severe
      - > 3.0: No Travel
    """
    reasons = []
    if snow_in_hr > 3.0:
        reasons.append(f"Blizzard snowfall rate ({snow_in_hr:.2f} in/hr > 3.0 in/hr) triggers NO TRAVEL.")
        return RiskLevel.NO_TRAVEL, reasons
    if snow_in_hr >= 2.0:
        reasons.append(f"Severe blizzard/heavy snowfall ({snow_in_hr:.2f} in/hr in 2.0–3.0 in/hr).")
        return RiskLevel.SEVERE, reasons
    if snow_in_hr >= 1.0:
        reasons.append(f"Heavy snowfall ({snow_in_hr:.2f} in/hr in 1.0–2.0 in/hr).")
        return RiskLevel.HIGH, reasons
    if snow_in_hr >= 0.5:
        reasons.append(f"Moderate snowfall ({snow_in_hr:.2f} in/hr in 0.5–1.0 in/hr).")
        return RiskLevel.MODERATE, reasons
    return RiskLevel.LOW, reasons


def evaluate_checkpoint_risk(
    wind_mph: float,
    rain_in_hr: float,
    snow_in_hr: float,
    load_weight_lbs: float
) -> Dict[str, Any]:
    """
    Evaluate composite risk at a specific checkpoint given weather conditions and truck load.
    The overall risk is the maximum severity across all individual condition risks.
    """
    wind_risk, wind_reasons = classify_wind_speed(wind_mph, load_weight_lbs)
    rain_risk, rain_reasons = classify_rain(rain_in_hr)
    snow_risk, snow_reasons = classify_snow(snow_in_hr)

    overall_level = max(wind_risk, rain_risk, snow_risk)
    
    all_reasons = []
    all_reasons.extend(wind_reasons)
    all_reasons.extend(rain_reasons)
    all_reasons.extend(snow_reasons)

    # Check if load rule altered wind risk compared to base wind rule
    base_wind_risk, _ = classify_wind_speed(wind_mph, 0.0)
    load_rule_applied = (wind_risk != base_wind_risk)

    return {
        "overall_risk": overall_level.name,
        "overall_risk_label": overall_level.label,
        "overall_risk_score": int(overall_level),
        "color": overall_level.color,
        "is_no_travel": overall_level == RiskLevel.NO_TRAVEL,
        "wind": {
            "value_mph": round(wind_mph, 1),
            "risk": wind_risk.name,
            "risk_label": wind_risk.label,
            "reasons": wind_reasons,
        },
        "rain": {
            "value_in_hr": round(rain_in_hr, 2),
            "risk": rain_risk.name,
            "risk_label": rain_risk.label,
            "reasons": rain_reasons,
        },
        "snow": {
            "value_in_hr": round(snow_in_hr, 2),
            "risk": snow_risk.name,
            "risk_label": snow_risk.label,
            "reasons": snow_reasons,
        },
        "load_weight_lbs": load_weight_lbs,
        "load_rule_applied": load_rule_applied,
        "hazard_reasons": all_reasons,
    }
