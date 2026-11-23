from typing import Optional, Dict, Any
from models.schemas import OptimizationResult, SavingsResult


def compute_savings(
    baseline: OptimizationResult,
    optimized: OptimizationResult,
    vehicle_mpg: float = 25.0,
    fuel_price: float = 3.50,
) -> SavingsResult:
    """Compute savings comparing baseline vs optimized itinerary.

    Fuel = distance / mpg; fuel cost = fuel * price.
    """
    baseline_travel = baseline.total_travel_duration_minutes
    optimized_travel = optimized.total_travel_duration_minutes
    time_saved = max(0.0, baseline_travel - optimized_travel)

    baseline_distance = baseline.total_distance_miles
    optimized_distance = optimized.total_distance_miles
    distance_saved = max(0.0, baseline_distance - optimized_distance)

    # Fuel calculations
    baseline_fuel_gallons = baseline_distance / vehicle_mpg if vehicle_mpg > 0 else 0
    optimized_fuel_gallons = optimized_distance / vehicle_mpg if vehicle_mpg > 0 else 0
    fuel_saved = max(0.0, baseline_fuel_gallons - optimized_fuel_gallons)
    fuel_cost_saved = fuel_saved * fuel_price

    assumptions = {
        "vehicle_mpg": vehicle_mpg,
        "fuel_price_per_gallon": fuel_price,
        "fuel_formula": "gallons = distance_miles / mpg",
        "cost_formula": "cost = gallons * fuel_price",
        "note": "Estimates based on straight-line / OSRM travel distances. Actual savings may vary.",
    }

    return SavingsResult(
        baseline_travel_minutes=baseline_travel,
        optimized_travel_minutes=optimized_travel,
        time_saved_minutes=round(time_saved, 1),
        baseline_distance_miles=baseline_distance,
        optimized_distance_miles=optimized_distance,
        distance_saved_miles=round(distance_saved, 2),
        fuel_saved_gallons=round(fuel_saved, 2),
        fuel_cost_saved_usd=round(fuel_cost_saved, 2),
        assumptions=assumptions,
    )


def baseline_sequence(
    errands: list,
    departure_time: str,
    vehicle_mpg: float = 25.0,
    fuel_price: float = 3.50,
) -> OptimizationResult:
    """Generate a baseline itinerary using the original errand order (no optimization).

    This represents the user's original, unoptimized plan.
    """
    from services.optimizer import _empty_result, _evaluate_sequence
    from services.route_engine import get_travel_matrix
    import asyncio

    # Build points: start + errands in original order + end
    points = []
    if hasattr(errands[0] if errands else None, 'lat'):
        pass

    # Use original order
    order = list(range(len(errands)))

    # Build minimal constraint dicts (no hard windows for baseline)
    constraints = {i: {} for i in range(len(errands))}

    # We need a departure base
    from datetime import datetime
    try:
        departure_base = datetime.fromisoformat(departure_time.replace("Z", "+00:00"))
    except Exception:
        departure_base = datetime.now()

    # Points: start + errands + end
    from services.route_engine import demo_coords

    ref_lat, ref_lng = demo_coords("baseline-start")
    pts = [(ref_lat, ref_lng)]
    for index, e in enumerate(errands):
        if e.lat is not None and e.lng is not None:
            pts.append((e.lat, e.lng))
        else:
            seed = e.location_query or e.name or f"errand-{index}"
            pts.append(demo_coords(seed, ref_lat, ref_lng))
    pts.append(demo_coords("baseline-final", ref_lat, ref_lng))

    # Run synchronously for baseline
    try:
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        time_matrix, dist_matrix = loop.run_until_complete(get_travel_matrix(pts))
        loop.close()
    except Exception:
        time_matrix = [[0.0] * len(pts) for _ in range(len(pts))]
        dist_matrix = [[0.0] * len(pts) for _ in range(len(pts))]

    from services.optimizer import ItineraryRequest
    req = ItineraryRequest(
        errands=errands,
        departure_time=departure_time,
        vehicle_mpg=vehicle_mpg,
        fuel_price=fuel_price,
    )

    # Evaluate original order
    result = _evaluate_sequence(
        order, errands, time_matrix, dist_matrix, 0, len(pts) - 1,
        departure_base, constraints, vehicle_mpg, fuel_price,
    )
    if result is None:
        result = _empty_result(departure_base)
        result["status"] = "feasible"
    result["solver_used"] = "baseline"

    from models.schemas import ItineraryStop
    stops_out = []
    for s in result.get("stops", []):
        stops_out.append(
            ItineraryStop(
                stop_index=s["stop_index"],
                errand_id=s["errand_id"],
                name=s["name"],
                address=s.get("address"),
                lat=s.get("lat"),
                lng=s.get("lng"),
                estimated_arrival=s["estimated_arrival"],
                estimated_departure=s["estimated_departure"],
                travel_time_minutes=s.get("travel_time_minutes"),
                travel_distance_miles=s.get("travel_distance_miles"),
                stop_duration_minutes=s["stop_duration_minutes"],
                constraint_warning=s.get("constraint_warning"),
            )
        )

    return OptimizationResult(
        status=result.get("status", "feasible"),
        total_travel_duration_minutes=result.get("total_travel_duration_minutes", 0),
        total_stop_duration_minutes=result.get("total_stop_duration_minutes", 0),
        total_distance_miles=result.get("total_distance_miles", 0),
        stops=stops_out,
        constraint_warnings=result.get("constraint_warnings", []),
        solver_used="baseline",
    )
