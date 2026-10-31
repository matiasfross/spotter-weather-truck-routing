"""
Weather Service for Weather-Aware Truck Routing.
Queries Open-Meteo API for real-time and forecast weather data with hourly resolution.
Includes intelligent batching, in-memory caching, and robust offline fallback simulation.
"""

import math
import requests
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from django.core.cache import cache

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

# Reusable HTTP session with connection pooling and keep-alive
HTTP_SESSION = requests.Session()


def get_weather_code_description(code: int) -> Dict[str, str]:
    """Translate WMO weather codes into human-readable descriptions and icons."""
    codes = {
        0: ("Clear sky", "sun"),
        1: ("Mainly clear", "sun"),
        2: ("Partly cloudy", "cloud-sun"),
        3: ("Overcast", "cloud"),
        45: ("Fog", "cloud-fog"),
        48: ("Depositing rime fog", "cloud-fog"),
        51: ("Light drizzle", "cloud-drizzle"),
        53: ("Moderate drizzle", "cloud-drizzle"),
        55: ("Dense drizzle", "cloud-drizzle"),
        61: ("Slight rain", "cloud-rain"),
        63: ("Moderate rain", "cloud-rain"),
        65: ("Heavy rain", "cloud-lightning-rain"),
        71: ("Slight snowfall", "snowflake"),
        73: ("Moderate snowfall", "snowflake"),
        75: ("Heavy snowfall", "snowflake"),
        77: ("Snow grains", "snowflake"),
        80: ("Slight rain showers", "cloud-rain"),
        81: ("Moderate rain showers", "cloud-rain"),
        82: ("Violent rain showers", "cloud-lightning"),
        85: ("Slight snow showers", "snowflake"),
        86: ("Heavy snow showers", "snowflake"),
        95: ("Thunderstorm", "cloud-lightning"),
        96: ("Thunderstorm with slight hail", "cloud-lightning"),
        99: ("Thunderstorm with heavy hail", "cloud-lightning"),
    }
    desc, icon = codes.get(code, ("Variable conditions", "cloud"))
    return {"description": desc, "icon": icon}


def _simulate_weather_point(lat: float, lon: float, dt: datetime) -> Dict[str, Any]:
    """
    Deterministic physical simulation fallback for offline testing or network outages.
    Generates realistic weather based on geographic coordinates (mountains, plains, coast) and time.
    """
    # Use spatial pseudo-hash for realistic gradients
    seed_val = math.sin(lat * 3.14159 / 18.0) * math.cos(lon * 3.14159 / 18.0)
    hour_factor = math.sin((dt.hour + (lon / 15.0)) * 3.14159 / 12.0)
    
    # Wind speed: Plains and mountain passes (e.g. Wyoming/Colorado -105 to -100 lon) have higher winds
    base_wind = 14.0 + 12.0 * math.fabs(seed_val)
    if -108.0 <= lon <= -98.0 and 38.0 <= lat <= 44.0:
        base_wind += 18.0 + 10.0 * math.sin(lat * 5.0)  # High wind corridor in Plains/Rockies
    wind_mph = max(2.0, min(65.0, base_wind + 8.0 * hour_factor))

    # Temperature in Fahrenheit
    temp_f = round(65.0 - (lat - 30.0) * 1.5 + 12.0 * hour_factor, 1)

    # Precipitation & Snowfall
    rain_in_hr = 0.0
    snow_in_hr = 0.0
    weather_code = 0

    if seed_val > 0.45:
        # Storm system
        if temp_f <= 32.0:
            snow_in_hr = round(0.3 + 1.8 * (seed_val - 0.45), 2)
            weather_code = 73 if snow_in_hr < 1.0 else (75 if snow_in_hr < 2.0 else 86)
        else:
            rain_in_hr = round(0.08 + 0.65 * (seed_val - 0.45), 2)
            weather_code = 61 if rain_in_hr < 0.25 else (63 if rain_in_hr < 0.50 else 65)
    elif seed_val > 0.2:
        weather_code = 2  # Partly cloudy
    else:
        weather_code = 0  # Clear

    info = get_weather_code_description(weather_code)
    return {
        "wind_speed_mph": round(wind_mph, 1),
        "wind_gusts_mph": round(wind_mph * 1.35, 1),
        "rain_in_hr": round(rain_in_hr, 2),
        "snow_in_hr": round(snow_in_hr, 2),
        "temperature_f": temp_f,
        "weather_code": weather_code,
        "description": info["description"],
        "icon": info["icon"],
        "is_simulated": True,
    }


def fetch_point_weather_timeseries(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """
    Fetch 7-day hourly weather timeseries from Open-Meteo for a given coordinate.
    Uses caching and persistent HTTP session to minimize network latency.
    """
    rounded_lat = round(lat, 2)
    rounded_lon = round(lon, 2)
    cache_key = f"weather_ts_{rounded_lat}_{rounded_lon}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    params = {
        "latitude": rounded_lat,
        "longitude": rounded_lon,
        "hourly": "temperature_2m,precipitation,rain,snowfall,wind_speed_10m,wind_gusts_10m,weather_code",
        "wind_speed_unit": "mph",
        "precipitation_unit": "inch",
        "temperature_unit": "fahrenheit",
        "timezone": "UTC",
    }

    try:
        resp = HTTP_SESSION.get(OPEN_METEO_URL, params=params, timeout=6)
        if resp.status_code == 200:
            data = resp.json()
            cache.set(cache_key, data, timeout=1800)  # Cache for 30 minutes
            return data
    except Exception:
        pass

    return None


def fetch_batch_weather(points: List[Dict[str, float]]) -> List[Optional[Dict[str, Any]]]:
    """
    Batch fetch weather for a list of coordinates [{'lat': ..., 'lon': ...}] using Open-Meteo batching.
    Uses chunk_size=50 (Open-Meteo maximum) and ThreadPoolExecutor for concurrent batch queries.
    """
    if not points:
        return []

    results: List[Optional[Dict[str, Any]]] = [None] * len(points)
    missing_indices = []
    lats = []
    lons = []

    for i, pt in enumerate(points):
        rlat = round(pt["lat"], 2)
        rlon = round(pt["lon"], 2)
        cache_key = f"weather_ts_{rlat}_{rlon}"
        cached = cache.get(cache_key)
        if cached:
            results[i] = cached
        else:
            missing_indices.append(i)
            lats.append(str(rlat))
            lons.append(str(rlon))

    if not missing_indices:
        return results

    chunk_size = 50
    chunks_info = []
    for c_start in range(0, len(missing_indices), chunk_size):
        sub_idx = missing_indices[c_start : c_start + chunk_size]
        sub_lats = lats[c_start : c_start + chunk_size]
        sub_lons = lons[c_start : c_start + chunk_size]
        chunks_info.append((sub_idx, sub_lats, sub_lons))

    def _execute_chunk_query(chunk_tuple):
        sub_idx, sub_lats, sub_lons = chunk_tuple
        params = {
            "latitude": ",".join(sub_lats),
            "longitude": ",".join(sub_lons),
            "hourly": "temperature_2m,precipitation,rain,snowfall,wind_speed_10m,wind_gusts_10m,weather_code",
            "wind_speed_unit": "mph",
            "precipitation_unit": "inch",
            "temperature_unit": "fahrenheit",
            "timezone": "UTC",
        }
        try:
            resp = HTTP_SESSION.get(OPEN_METEO_URL, params=params, timeout=8)
            if resp.status_code == 200:
                data = resp.json()
                items = data if isinstance(data, list) else [data]
                return (sub_idx, sub_lats, sub_lons, items)
        except Exception:
            pass
        return (sub_idx, sub_lats, sub_lons, [])

    if len(chunks_info) == 1:
        chunk_outputs = [_execute_chunk_query(chunks_info[0])]
    else:
        with ThreadPoolExecutor(max_workers=min(4, len(chunks_info))) as executor:
            chunk_outputs = list(executor.map(_execute_chunk_query, chunks_info))

    for sub_idx, sub_lats, sub_lons, items in chunk_outputs:
        for idx_in_chunk, item in enumerate(items):
            if idx_in_chunk < len(sub_idx):
                orig_idx = sub_idx[idx_in_chunk]
                results[orig_idx] = item
                cache.set(f"weather_ts_{sub_lats[idx_in_chunk]}_{sub_lons[idx_in_chunk]}", item, timeout=1800)

    return results


def get_checkpoint_weather(
    lat: float,
    lon: float,
    eta_dt: datetime,
    ts_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Get weather at a specific coordinate and specific ETA timestamp.
    Accepts pre-fetched in-memory ts_data or queries cache/API.
    Uses O(1) timestamp hash mapping for instant lookup.
    """
    if ts_data is None:
        ts_data = fetch_point_weather_timeseries(lat, lon)

    if not ts_data or "hourly" not in ts_data:
        # Fallback to physical simulation
        return _simulate_weather_point(lat, lon, eta_dt)

    hourly = ts_data["hourly"]
    times = hourly.get("time", [])
    if not times:
        return _simulate_weather_point(lat, lon, eta_dt)

    # O(1) pre-indexed timestamp map
    time_map = ts_data.get("_time_map")
    if time_map is None:
        time_map = {t: i for i, t in enumerate(times)}
        ts_data["_time_map"] = time_map

    target_str = eta_dt.strftime("%Y-%m-%dT%H:00")
    best_idx = time_map.get(target_str)

    if best_idx is None:
        # Fallback to closest hour if exact hour string not found
        min_diff = float("inf")
        target_ts = eta_dt.replace(tzinfo=timezone.utc).timestamp()
        best_idx = 0
        for idx, t_str in enumerate(times):
            try:
                t_dt = datetime.fromisoformat(t_str).replace(tzinfo=timezone.utc)
                diff = abs(t_dt.timestamp() - target_ts)
                if diff < min_diff:
                    min_diff = diff
                    best_idx = idx
            except Exception:
                continue

    try:
        wind_speed = float(hourly["wind_speed_10m"][best_idx] or 0.0)
        wind_gusts = float(hourly.get("wind_gusts_10m", [wind_speed])[best_idx] or wind_speed)
        rain_val = float(hourly.get("rain", hourly.get("precipitation", [0.0]))[best_idx] or 0.0)
        snow_val = float(hourly.get("snowfall", [0.0])[best_idx] or 0.0)
        temp_f = float(hourly.get("temperature_2m", [60.0])[best_idx] or 60.0)
        weather_code = int(hourly.get("weather_code", [0])[best_idx] or 0)

        info = get_weather_code_description(weather_code)
        return {
            "wind_speed_mph": round(wind_speed, 1),
            "wind_gusts_mph": round(wind_gusts, 1),
            "rain_in_hr": round(rain_val, 2),
            "snow_in_hr": round(snow_val, 2),
            "temperature_f": round(temp_f, 1),
            "weather_code": weather_code,
            "description": info["description"],
            "icon": info["icon"],
            "is_simulated": False,
        }
    except Exception:
        return _simulate_weather_point(lat, lon, eta_dt)
