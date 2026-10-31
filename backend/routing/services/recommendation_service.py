"""
Recommendation Engine for Weather-Aware Truck Routing.
Implements the multi-criteria preference hierarchy:
  1. Fewest Severe miles (including No-Travel conditions)
  2. Fewest High miles
  3. Lowest average risk
  4. Shortest travel times
"""

from typing import List, Dict, Any
from routing.services.risk_service import (
    evaluate_checkpoint_risk,
    RiskLevel
)
from routing.services.weather_service import get_checkpoint_weather, fetch_batch_weather


def enrich_routes_with_weather_and_risk(
    routes: List[Dict[str, Any]],
    load_weight_lbs: float
) -> List[Dict[str, Any]]:
    """
    For each route and every checkpoint along it:
      1. Batch-fetch weather for all checkpoints across all routes.
      2. Evaluate composite risk against wind thresholds, load rules, rain, and snow.
      3. Aggregate miles spent in each risk classification.
    """
    # Collect all unique checkpoint coordinates across all routes for batch fetching
    all_points = []
    seen = set()
    for route in routes:
        for cp in route.get("checkpoints", []):
            k = (round(cp["lat"], 2), round(cp["lon"], 2))
            if k not in seen:
                seen.add(k)
                all_points.append({"lat": cp["lat"], "lon": cp["lon"]})

    # Warm cache and populate in-memory map with batch request
    ts_map = {}
    if all_points:
        batch_results = fetch_batch_weather(all_points)
        for pt, ts in zip(all_points, batch_results):
            if ts:
                ts_map[(round(pt["lat"], 2), round(pt["lon"], 2))] = ts

    for route in routes:
        checkpoints = route.get("checkpoints", [])
        
        no_travel_miles = 0.0
        severe_miles = 0.0
        high_miles = 0.0
        moderate_miles = 0.0
        low_miles = 0.0

        total_weighted_risk = 0.0
        total_miles_evaluated = 0.0

        max_wind_mph = 0.0
        max_rain_in = 0.0
        max_snow_in = 0.0
        has_no_travel = False
        load_rule_trigger_count = 0

        for cp in checkpoints:
            eta_dt = cp.get("_eta_dt")
            coord_key = (round(cp["lat"], 2), round(cp["lon"], 2))
            cp_ts = ts_map.get(coord_key)
            weather = get_checkpoint_weather(cp["lat"], cp["lon"], eta_dt, ts_data=cp_ts)
            risk = evaluate_checkpoint_risk(
                wind_mph=weather["wind_speed_mph"],
                rain_in_hr=weather["rain_in_hr"],
                snow_in_hr=weather["snow_in_hr"],
                load_weight_lbs=load_weight_lbs
            )

            # Attach to checkpoint
            cp["weather"] = weather
            cp["risk"] = risk

            seg_miles = cp.get("segment_miles", 0.0)
            overall_score = risk["overall_risk_score"]
            overall_risk = risk["overall_risk"]

            total_weighted_risk += overall_score * seg_miles
            total_miles_evaluated += seg_miles

            if overall_risk == "NO_TRAVEL":
                no_travel_miles += seg_miles
                has_no_travel = True
            elif overall_risk == "SEVERE":
                severe_miles += seg_miles
            elif overall_risk == "HIGH":
                high_miles += seg_miles
            elif overall_risk == "MODERATE":
                moderate_miles += seg_miles
            else:
                low_miles += seg_miles

            if weather["wind_speed_mph"] > max_wind_mph:
                max_wind_mph = weather["wind_speed_mph"]
            if weather["rain_in_hr"] > max_rain_in:
                max_rain_in = weather["rain_in_hr"]
            if weather["snow_in_hr"] > max_snow_in:
                max_snow_in = weather["snow_in_hr"]
            if risk.get("load_rule_applied"):
                load_rule_trigger_count += 1

            # Clean temporary datetime object
            if "_eta_dt" in cp:
                del cp["_eta_dt"]

        avg_risk_score = (
            round(total_weighted_risk / total_miles_evaluated, 2)
            if total_miles_evaluated > 0 else 1.0
        )

        # Risk level representation of average score
        if avg_risk_score >= 4.5:
            avg_risk_label = "Severe / No Travel"
            avg_risk_color = "#7f1d1d"
        elif avg_risk_score >= 3.5:
            avg_risk_label = "Severe"
            avg_risk_color = "#ef4444"
        elif avg_risk_score >= 2.5:
            avg_risk_label = "High"
            avg_risk_color = "#f97316"
        elif avg_risk_score >= 1.5:
            avg_risk_label = "Moderate"
            avg_risk_color = "#f59e0b"
        else:
            avg_risk_label = "Low"
            avg_risk_color = "#10b981"

        route["risk_summary"] = {
            "no_travel_miles": round(no_travel_miles, 1),
            "severe_miles": round(severe_miles, 1),
            "severe_and_worse_miles": round(no_travel_miles + severe_miles, 1),
            "high_miles": round(high_miles, 1),
            "moderate_miles": round(moderate_miles, 1),
            "low_miles": round(low_miles, 1),
            "average_risk_score": avg_risk_score,
            "average_risk_label": avg_risk_label,
            "average_risk_color": avg_risk_color,
            "has_no_travel": has_no_travel,
            "load_rule_trigger_count": load_rule_trigger_count,
            "max_wind_mph": round(max_wind_mph, 1),
            "max_rain_in_hr": round(max_rain_in, 2),
            "max_snow_in_hr": round(max_snow_in, 2),
        }

    return routes


def select_best_route(routes: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Ranks routes according to strict priority order:
      1. Fewest Severe miles (including No-Travel conditions)
      2. Fewest High miles
      3. Lowest average risk
      4. Shortest travel times
    """
    if not routes:
        return {}

    def sorting_key(r: Dict[str, Any]):
        summary = r["risk_summary"]
        severe_plus = summary["severe_and_worse_miles"]
        high_m = summary["high_miles"]
        avg_risk = summary["average_risk_score"]
        duration = r["duration_seconds"]
        return (severe_plus, high_m, avg_risk, duration)

    ranked_routes = sorted(routes, key=sorting_key)

    for idx, r in enumerate(ranked_routes):
        r["rank"] = idx + 1
        r["is_recommended"] = (idx == 0)

    best = ranked_routes[0]
    best_summary = best["risk_summary"]

    justifications = []
    
    if best_summary["has_no_travel"]:
        justifications.append(
            f"WARNING: All alternative routes encounter severe conditions, but {best['name']} "
            f"minimizes total hazardous exposure."
        )
    else:
        if best_summary["severe_miles"] == 0:
            justifications.append(f"0 Severe or No-Travel miles detected along {best['name']}.")
        else:
            justifications.append(f"Lowest exposure to severe conditions ({best_summary['severe_miles']} Severe miles).")

    if len(ranked_routes) > 1:
        second = ranked_routes[1]
        sec_sum = second["risk_summary"]
        severe_diff = sec_sum["severe_and_worse_miles"] - best_summary["severe_and_worse_miles"]
        high_diff = sec_sum["high_miles"] - best_summary["high_miles"]
        time_diff_min = int((second["duration_seconds"] - best["duration_seconds"]) / 60)

        if severe_diff > 0:
            justifications.append(f"Avoids {severe_diff:.1f} hazardous miles compared to {second['name']}.")
        elif high_diff > 0:
            justifications.append(f"Reduces High-risk exposure by {high_diff:.1f} miles vs {second['name']}.")
        elif time_diff_min > 0:
            justifications.append(f"Saves {time_diff_min} minutes of driving time vs {second['name']}.")

    if best_summary["load_rule_trigger_count"] > 0:
        justifications.append(
            f"Notice: Truck weight rules evaluated at {best_summary['load_rule_trigger_count']} checkpoints."
        )

    return {
        "recommended_route_id": best["id"],
        "recommended_route_name": best["name"],
        "summary": " ".join(justifications),
        "routes": routes,
    }
