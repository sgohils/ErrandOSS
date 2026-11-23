from fastapi import APIRouter, HTTPException, Query
from models.schemas import GeocodeResponse, GeocodeResult, HealthResponse
from services.route_engine import geocode_fallback_address
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

GEOCODING_API_KEY = os.getenv("GEOCODING_API_KEY", "")
DEMO_MODE = not GEOCODING_API_KEY


@router.get("/geocode", response_model=GeocodeResponse)
async def geocode(q: str = Query(..., min_length=1)):
    """Geocode a location query to coordinates.

    Falls back to deterministic demo coordinates when no geocoding API key is
    configured. Demo results are clearly marked unverified.
    """
    try:
        if not q or not q.strip():
            raise HTTPException(status_code=422, detail="query must not be empty")
        results = []

        # Try known demo coordinates first (always simulated, never live)
        demo = geocode_fallback_address(q.strip())
        if demo:
            lat, lng = demo
            results.append(
                GeocodeResult(address=q.strip(), lat=lat, lng=lng, verified=False)
            )

        # If external geocoding is available, try it too
        if GEOCODING_API_KEY:
            try:
                import httpx
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(
                        "https://api.mapbox.com/geocoding/v5/mapbox.places/{}.json".format(q),
                        params={"access_token": GEOCODING_API_KEY, "limit": 3},
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        for feature in data.get("features", []):
                            lng, lat = feature["center"]
                            results.append(
                                GeocodeResult(
                                    address=feature["place_name"],
                                    lat=lat,
                                    lng=lng,
                                    verified=True,
                                )
                            )
            except Exception as e:
                logger.warning(f"External geocoding failed: {e}")

        if not results:
            # Return unverified result so user can manually enter coordinates
            results.append(
                GeocodeResult(address=q, lat=0.0, lng=0.0, verified=False)
            )

        return GeocodeResponse(results=results)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Geocode error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok")
