from datetime import datetime
from fastapi import APIRouter, HTTPException

from models.schemas import ItineraryRequest, ItineraryStop, OptimizationResult
from services.config import settings
from services.optimizer import _evaluate_sequence, build_constraints, optimize
from services.route_engine import build_travel_matrix, demo_coords
from services.savings import compute_savings

router = APIRouter()


def _build_points(request: ItineraryRequest):
    if request.starting_lat is not None and request.starting_lng is not None:
        ref_lat, ref_lng = request.starting_lat, request.starting_lng
    else:
        ref_lat, ref_lng = demo_coords("start")
    points = [(ref_lat, ref_lng)]
    for index, e in enumerate(request.errands):
        if e.lat is not None and e.lng is not None:
            points.append((e.lat, e.lng))
        else:
            seed = e.location_query or e.name or f"errand-{index}"
            points.append(demo_coords(seed, ref_lat, ref_lng))
    if request.final_lat is not None and request.final_lng is not None:
        points.append((request.final_lat, request.final_lng))
    else:
        points.append(demo_coords(request.final_destination or "final", ref_lat, ref_lng))
    return points, 0, len(points) - 1


def _to_baseline_stops(raw_stops: list) -> list:
    stops_out = []
    for s in raw_stops:
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
    return stops_out


@router.post("/optimize")
async def optimize_itinerary(request: ItineraryRequest):
    try:
        if not request.errands:
            raise HTTPException(status_code=422, detail="at least one errand is required")

        departure = datetime.fromisoformat(request.departure_time)
        final_arrival_deadline = None
        if request.final_arrival_deadline:
            final_arrival_deadline = datetime.fromisoformat(request.final_arrival_deadline)

        result = await optimize(request)

        mpg = request.vehicle_mpg if request.vehicle_mpg else settings.DEFAULT_MPG
        fuel_price = request.fuel_price if request.fuel_price else settings.DEFAULT_FUEL_PRICE

        nodes, start_index, end_index = _build_points(request)
        durations, distances = await build_travel_matrix(nodes)

        constraints = build_constraints(
            request.errands,
            departure,
            request.final_arrival_deadline,
        )
        baseline_order = list(range(len(request.errands)))
        baseline_raw = _evaluate_sequence(
            baseline_order,
            request.errands,
            durations,
            distances,
            start_index,
            end_index,
            departure,
            constraints,
            mpg,
            fuel_price,
        )
        if baseline_raw is None:
            baseline_raw = {
                "status": "infeasible",
                "stops": [],
                "total_travel_duration_minutes": 0,
                "total_stop_duration_minutes": sum(e.estimated_duration_minutes for e in request.errands),
                "total_distance_miles": 0,
                "constraint_warnings": ["No feasible baseline route satisfies all constraints."],
            }
        baseline = OptimizationResult(
            status=baseline_raw.get("status", "feasible"),
            total_travel_duration_minutes=round(baseline_raw.get("total_travel_duration_minutes", 0), 2),
            total_stop_duration_minutes=baseline_raw.get("total_stop_duration_minutes", 0),
            total_distance_miles=round(baseline_raw.get("total_distance_miles", 0), 3),
            stops=_to_baseline_stops(baseline_raw.get("stops", [])),
            constraint_warnings=baseline_raw.get("constraint_warnings", []),
            solver_used="baseline",
        )

        savings = compute_savings(baseline, result, mpg, fuel_price)

        return {
            "result": result,
            "baseline": baseline,
            "savings": savings,
            "simulated": settings.demo_mode,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
