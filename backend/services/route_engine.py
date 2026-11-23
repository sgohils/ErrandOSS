import math
from typing import List, Tuple
import httpx

from services.config import settings

EARTH_RADIUS_MILES = 3958.8
DEFAULT_SPEED_MPH = 25.0
DEFAULT_LAT = 40.7128
DEFAULT_LNG = -74.0060


def haversine_miles(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * EARTH_RADIUS_MILES * math.asin(math.sqrt(a))


def travel_minutes(distance_miles: float, speed_mph: float = DEFAULT_SPEED_MPH) -> float:
    if distance_miles <= 0:
        return 1.0
    return max(1.0, (distance_miles / speed_mph) * 60.0)


def demo_coords(seed: str, ref_lat: float = DEFAULT_LAT, ref_lng: float = DEFAULT_LNG) -> Tuple[float, float]:
    h = 0
    for ch in seed:
        h = (h * 31 + ord(ch)) % 1000003
    lat_offset = ((h % 200) - 100) / 1000.0
    lng_offset = (((h // 200) % 200) - 100) / 1000.0
    return ref_lat + lat_offset, ref_lng + lng_offset


async def fetch_osrm_matrix(locations: List[Tuple[float, float]]):
    coords = ";".join(f"{lng:.6f},{lat:.6f}" for lat, lng in locations)
    url = f"{settings.OSRM_BASE_URL.rstrip('/')}/table/v1/driving/{coords}"
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(url, params={"annotations": "duration,distance"})
        response.raise_for_status()
        data = response.json()
    return data["durations"], data["distances"]


def geocode_fallback_address(query: str):
    """Return deterministic demo coordinates for a query, or None."""

    if not query or not query.strip():
        return None
    return demo_coords(query.strip())


async def build_travel_matrix(points: List[Tuple[float, float]]):
    count = len(points)
    durations = [[0.0] * count for _ in range(count)]
    distances = [[0.0] * count for _ in range(count)]
    try:
        raw_durations, raw_distances = await fetch_osrm_matrix(points)
        for i in range(count):
            for j in range(count):
                durations[i][j] = float(raw_durations[i][j]) / 60.0
                distances[i][j] = float(raw_distances[i][j]) / 1609.34
        # Enforce symmetry (road networks can be one-way; take max direction)
        for i in range(count):
            for j in range(i + 1, count):
                d = max(durations[i][j], durations[j][i])
                durations[i][j] = durations[j][i] = d
                dist = max(distances[i][j], distances[j][i])
                distances[i][j] = distances[j][i] = dist
    except Exception:
        for i in range(count):
            for j in range(count):
                if i == j:
                    continue
                lat1, lng1 = points[i]
                lat2, lng2 = points[j]
                distance = haversine_miles(lat1, lng1, lat2, lng2)
                distances[i][j] = distance
                durations[i][j] = travel_minutes(distance)
    return durations, distances


get_travel_matrix = build_travel_matrix
