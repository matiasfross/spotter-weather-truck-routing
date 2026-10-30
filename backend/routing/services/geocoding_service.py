"""
Geocoding Service for Weather-Aware Truck Routing.
Uses OpenStreetMap Nominatim with local cache and freight-hub fallbacks.
"""

import hashlib
import requests
from typing import Optional, Dict, Any, List
from django.core.cache import cache

KNOWN_HUBS: Dict[str, Dict[str, Any]] = {
    "chicago": {"name": "Chicago, IL, USA", "lat": 41.8781, "lon": -87.6298},
    "denver": {"name": "Denver, CO, USA", "lat": 39.7392, "lon": -104.9903},
    "salt lake city": {"name": "Salt Lake City, UT, USA", "lat": 40.7608, "lon": -111.8910},
    "seattle": {"name": "Seattle, WA, USA", "lat": 47.6062, "lon": -122.3321},
    "dallas": {"name": "Dallas, TX, USA", "lat": 32.7767, "lon": -96.7970},
    "atlanta": {"name": "Atlanta, GA, USA", "lat": 33.7490, "lon": -84.3880},
    "new york": {"name": "New York, NY, USA", "lat": 40.7128, "lon": -74.0060},
    "los angeles": {"name": "Los Angeles, CA, USA", "lat": 34.0522, "lon": -118.2437},
    "miami": {"name": "Miami, FL, USA", "lat": 25.7617, "lon": -80.1918},
    "kansas city": {"name": "Kansas City, MO, USA", "lat": 39.0997, "lon": -94.5786},
    "minneapolis": {"name": "Minneapolis, MN, USA", "lat": 44.9778, "lon": -93.2650},
    "phoenix": {"name": "Phoenix, AZ, USA", "lat": 33.4484, "lon": -112.0740},
    "st louis": {"name": "St. Louis, MO, USA", "lat": 38.6270, "lon": -90.1994},
    "detroit": {"name": "Detroit, MI, USA", "lat": 42.3314, "lon": -83.0458},
}

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "WeatherAwareTruckRouting/1.0 (contact: info@truckrouting.internal)"


def _safe_key(prefix: str, text: str) -> str:
    h = hashlib.md5(text.strip().lower().encode("utf-8")).hexdigest()
    return f"{prefix}_{h}"


def geocode_address(query: str) -> Optional[Dict[str, Any]]:
    """
    Geocode an address string to lat/lon.
    Uses cache first, then Nominatim API, then known freight hubs fallback.
    """
    if not query or not query.strip():
        return None

    clean_query = query.strip()
    cache_key = _safe_key("geocode", clean_query)
    cached = cache.get(cache_key)
    if cached:
        return cached

    query_lower = clean_query.lower()
    for hub_name, hub_data in KNOWN_HUBS.items():
        if hub_name in query_lower or query_lower in hub_name:
            result = {
                "name": hub_data["name"],
                "lat": hub_data["lat"],
                "lon": hub_data["lon"],
                "display_name": hub_data["name"],
            }
            cache.set(cache_key, result, timeout=86400)
            return result

    try:
        response = requests.get(
            NOMINATIM_URL,
            params={
                "q": clean_query,
                "format": "json",
                "limit": 1,
                "addressdetails": 1,
            },
            headers={"User-Agent": USER_AGENT},
            timeout=5,
        )
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                item = data[0]
                result = {
                    "name": item.get("display_name", clean_query),
                    "lat": float(item["lat"]),
                    "lon": float(item["lon"]),
                    "display_name": item.get("display_name", clean_query),
                }
                cache.set(cache_key, result, timeout=86400)
                return result
    except Exception:
        pass

    for hub_key, hub_data in KNOWN_HUBS.items():
        if any(part in clean_query.lower() for part in hub_key.split()):
            result = {
                "name": hub_data["name"],
                "lat": hub_data["lat"],
                "lon": hub_data["lon"],
                "display_name": hub_data["name"],
            }
            cache.set(cache_key, result, timeout=86400)
            return result

    return None


def search_places(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Search multiple places for autocompletion."""
    if not query or len(query.strip()) < 2:
        return []

    clean_query = query.strip()
    cache_key = _safe_key("places", f"{clean_query}_{limit}")
    cached = cache.get(cache_key)
    if cached:
        return cached

    results = []

    query_lower = clean_query.lower()
    for hub_name, hub_data in KNOWN_HUBS.items():
        if query_lower in hub_name or any(w.startswith(query_lower) for w in hub_name.split()):
            results.append({
                "name": hub_data["name"],
                "lat": hub_data["lat"],
                "lon": hub_data["lon"],
                "display_name": hub_data["name"],
            })

    try:
        response = requests.get(
            NOMINATIM_URL,
            params={
                "q": clean_query,
                "format": "json",
                "limit": limit,
                "addressdetails": 1,
            },
            headers={"User-Agent": USER_AGENT},
            timeout=5,
        )
        if response.status_code == 200:
            data = response.json()
            for item in data:
                entry = {
                    "name": item.get("display_name", clean_query),
                    "lat": float(item["lat"]),
                    "lon": float(item["lon"]),
                    "display_name": item.get("display_name", clean_query),
                }
                if not any(abs(r["lat"] - entry["lat"]) < 0.05 and abs(r["lon"] - entry["lon"]) < 0.05 for r in results):
                    results.append(entry)
    except Exception:
        pass

    cache.set(cache_key, results[:limit], timeout=3600)
    return results[:limit]
