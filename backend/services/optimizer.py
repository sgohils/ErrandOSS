import itertools
import logging
from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime, timedelta

from models.schemas import (
    ErrandCreate,
    ItineraryRequest,
    ItineraryStop,
    OptimizationResult,
)
from services.route_engine import demo_coords, get_travel_matrix

logger = logging.getLogger(__name__)


def _time_to_minutes(t: Optional[str], base: datetime) -> Optional[int]:
    if t is None:
        return None
    try:
        dt = datetime.fromisoformat(t.replace("Z", "+00:00"))
        return int((dt - base).total_seconds() / 60)
    except Exception:
        return None


def _minutes_to_time(minutes: float, base: datetime) -> str:
    dt = base + timedelta(minutes=minutes)
    return dt.isoformat()


def _try_ortools(
    errands: List[ErrandCreate],
    time_matrix: List[List[float]],
    dist_matrix: List[List[float]],
    start_idx: int,
    end_idx: int,
    departure_base: datetime,
    constraints: Dict[int, Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """Attempt OR-Tools optimization. Returns None if unavailable or infeasible."""
    try:
        from ortools.constraint_solver import routing_enums_pb2
        from ortools.constraint_solver import pywrapcp
    except ImportError:
        return None

    n = len(errands)
    if n == 0:
        return None

    # OR-Tools routing: nodes 0..n-1 are errands, we add start/end as fixed nodes
    # Simpler: solve TSP over errands only, then prepend start and append end
    manager = pywrapcp.RoutingIndexManager(n, 1, 0)
    routing = pywrapcp.RoutingModel(manager)

    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return int(time_matrix[from_node][to_node])

    transit_callback_index = routing.RegisterTransitCallback(time_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Add time window constraints
    dimension_name = "Time"
    routing.AddDimension(
        transit_callback_index,
        0,  # no slack
        1440,  # max time per vehicle (minutes in a day)
        False,  # don't force start cumul to zero
        dimension_name,
    )
    time_dimension = routing.GetDimensionOrDie(dimension_name)

    for i in range(n):
        c = constraints.get(i, {})
        if c.get("earliest") is not None:
            time_dimension.CumulVar(i).SetRange(c["earliest"], 1440)
        if c.get("latest") is not None:
            time_dimension.CumulVar(i).SetRange(0, c["latest"])

    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_params.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_params.time_limit.seconds = 10

    solution = routing.SolveWithParameters(search_params)
    if solution is None:
        return None

    # Extract route
    order = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        order.append(manager.IndexToNode(index))
        index = solution.Value(routing.NextVar(index))

    return {"order": order, "solver": "ortools"}


def _exhaustive_search(
    errands: List[ErrandCreate],
    time_matrix: List[List[float]],
    dist_matrix: List[List[float]],
    start_idx: int,
    end_idx: int,
    departure_base: datetime,
    constraints: Dict[int, Dict[str, Any]],
    vehicle_mpg: Optional[float],
    fuel_price: Optional[float],
) -> Dict[str, Any]:
    """Exhaustive search for small errand sets (<= 10)."""
    n = len(errands)
    if n == 0:
        return _empty_result(departure_base)

    best = None
    best_cost = float("inf")

    for perm in itertools.permutations(range(n)):
        result = _evaluate_sequence(
            list(perm),
            errands,
            time_matrix,
            dist_matrix,
            start_idx,
            end_idx,
            departure_base,
            constraints,
            vehicle_mpg,
            fuel_price,
        )
        if result is None:
            continue
        cost = result["total_cost"]
        if cost < best_cost:
            best_cost = cost
            best = result

    if best is None:
        # No feasible sequence found
        return {
            "status": "infeasible",
            "stops": [],
            "total_travel_duration_minutes": 0,
            "total_stop_duration_minutes": sum(e.estimated_duration_minutes for e in errands),
            "total_distance_miles": 0,
            "constraint_warnings": [
                "No feasible route satisfies all time-window constraints."
            ],
            "solver_used": "exhaustive",
        }

    return best


def _heuristic_search(
    errands: List[ErrandCreate],
    time_matrix: List[List[float]],
    dist_matrix: List[List[float]],
    start_idx: int,
    end_idx: int,
    departure_base: datetime,
    constraints: Dict[int, Dict[str, Any]],
    vehicle_mpg: Optional[float],
    fuel_price: Optional[float],
) -> Dict[str, Any]:
    """Nearest-neighbor heuristic with time-window awareness for larger sets."""
    n = len(errands)
    if n == 0:
        return _empty_result(departure_base)

    # Start from the starting location
    unvisited = set(range(n))
    current = start_idx
    current_time = 0  # minutes from departure
    order = []
    total_travel = 0.0
    total_distance = 0.0
    warnings = []

    while unvisited:
        best_next = None
        best_score = float("inf")

        for next_idx in list(unvisited):
            travel = time_matrix[current][next_idx] if current < len(time_matrix) else 5
            arrival = current_time + travel

            # Check time windows
            c = constraints.get(next_idx, {})
            if c.get("earliest") is not None and arrival < c["earliest"]:
                arrival = c["earliest"]  # wait until opening
            if c.get("latest") is not None and arrival > c["latest"]:
                continue  # infeasible to visit this stop in window

            score = arrival  # earliest arrival first
            if best_next is None or score < best_score:
                best_next = next_idx
                best_score = score

        if best_next is None:
            break

        order.append(best_next)
        unvisited.remove(best_next)
        travel = time_matrix[current][best_next] if current < len(time_matrix) else 5
        total_travel += travel
        total_distance += dist_matrix[current][best_next] if current < len(dist_matrix) else 0
        current_time = best_score + errands[best_next].estimated_duration_minutes
        current = best_next

    # Return to final destination
    if end_idx is not None and end_idx < len(time_matrix):
        total_travel += time_matrix[current][end_idx]
        total_distance += dist_matrix[current][end_idx]

    return _build_result_from_order(
        order,
        errands,
        time_matrix,
        dist_matrix,
        start_idx,
        end_idx,
        departure_base,
        constraints,
        vehicle_mpg,
        fuel_price,
        warnings,
    )


def _evaluate_sequence(
    order: List[int],
    errands: List[ErrandCreate],
    time_matrix: List[List[float]],
    dist_matrix: List[List[float]],
    start_idx: int,
    end_idx: Optional[int],
    departure_base: datetime,
    constraints: Dict[int, Dict[str, Any]],
    vehicle_mpg: Optional[float],
    fuel_price: Optional[float],
) -> Optional[Dict[str, Any]]:
    """Evaluate a specific sequence. Returns None if hard constraints violated."""
    current_time = 0
    current = start_idx
    total_travel = 0.0
    total_distance = 0.0
    stops = []
    warnings = []
    stop_duration_total = 0

    for order_idx, errand_idx in enumerate(order):
        e = errands[errand_idx]
        travel = time_matrix[current][errand_idx] if current < len(time_matrix) else 5
        arrival = current_time + travel

        c = constraints.get(errand_idx, {})
        # Hard constraint: latest arrival
        if c.get("latest") is not None and arrival > c["latest"]:
            return None

        # Wait if too early
        if c.get("earliest") is not None and arrival < c["earliest"]:
            arrival = c["earliest"]
            wait_minutes = c["earliest"] - (current_time + travel)
            if wait_minutes > 5:
                warnings.append(f"Wait {int(wait_minutes)} min for {e.name} to open")

        departure = arrival + e.estimated_duration_minutes

        # Closing time check (hard constraint)
        if c.get("closing") is not None and departure > c["closing"]:
            return None

        dist = dist_matrix[current][errand_idx] if current < len(dist_matrix) else 0
        total_travel += travel
        total_distance += dist
        stop_duration_total += e.estimated_duration_minutes

        warning = None
        if c.get("closing") is not None:
            close_minutes = c["closing"]
            dep_minutes = departure
            if dep_minutes > close_minutes:
                warning = f"{e.name} closes at {_minutes_to_time(close_minutes, departure_base)} — schedule may be tight"
                warnings.append(warning)

        stops.append(
            {
                "stop_index": order_idx,
                "errand_id": f"errand-{errand_idx}",
                "name": e.name,
                "address": e.address or e.location_query or "",
                "lat": e.lat,
                "lng": e.lng,
                "estimated_arrival": _minutes_to_time(arrival, departure_base),
                "estimated_departure": _minutes_to_time(departure, departure_base),
                "travel_time_minutes": round(travel, 1),
                "travel_distance_miles": round(dist, 2),
                "stop_duration_minutes": e.estimated_duration_minutes,
                "constraint_warning": warning,
            }
        )

        current_time = departure
        current = errand_idx

    # Return to final destination
    if end_idx is not None and end_idx < len(time_matrix):
        total_travel += time_matrix[current][end_idx]
        total_distance += dist_matrix[current][end_idx]

    total_cost = total_travel
    # Penalties for missed constraints (shouldn't happen with hard checks above)
    penalty = len(warnings) * 5
    total_cost += penalty

    return {
        "status": "optimal",
        "stops": stops,
        "total_travel_duration_minutes": round(total_travel, 1),
        "total_stop_duration_minutes": stop_duration_total,
        "total_distance_miles": round(total_distance, 2),
        "constraint_warnings": warnings,
        "solver_used": "exhaustive",
        "total_cost": total_cost,
    }


def _build_result_from_order(
    order: List[int],
    errands: List[ErrandCreate],
    time_matrix: List[List[float]],
    dist_matrix: List[List[float]],
    start_idx: int,
    end_idx: Optional[int],
    departure_base: datetime,
    constraints: Dict[int, Dict[str, Any]],
    vehicle_mpg: Optional[float],
    fuel_price: Optional[float],
    warnings: List[str],
) -> Dict[str, Any]:
    result = _evaluate_sequence(
        order,
        errands,
        time_matrix,
        dist_matrix,
        start_idx,
        end_idx,
        departure_base,
        constraints,
        vehicle_mpg,
        fuel_price,
    )
    if result is None:
        result = {
            "status": "infeasible",
            "stops": [],
            "total_travel_duration_minutes": 0,
            "total_stop_duration_minutes": sum(e.estimated_duration_minutes for e in errands),
            "total_distance_miles": 0,
            "constraint_warnings": warnings + ["No feasible route found with heuristic."],
            "solver_used": "heuristic",
        }
    result["solver_used"] = "heuristic"
    return result


def _empty_result(departure_base: datetime) -> Dict[str, Any]:
    return {
        "status": "optimal",
        "stops": [],
        "total_travel_duration_minutes": 0,
        "total_stop_duration_minutes": 0,
        "total_distance_miles": 0,
        "constraint_warnings": [],
        "solver_used": "exhaustive",
    }


def build_constraints(
    errands: List[ErrandCreate],
    departure_base: datetime,
    final_deadline: Optional[str] = None,
) -> Dict[int, Dict[str, Any]]:
    """Build per-errand constraint dictionaries."""
    constraints = {}
    deadline_minutes = None
    if final_deadline:
        deadline_minutes = _time_to_minutes(final_deadline, departure_base)

    for i, e in enumerate(errands):
        c = {}
        if e.opening_time:
            open_dt = datetime.fromisoformat(f"{departure_base.date()}T{e.opening_time}")
            c["earliest"] = int((open_dt - departure_base).total_seconds() / 60)
        if e.closing_time:
            close_dt = datetime.fromisoformat(f"{departure_base.date()}T{e.closing_time}")
            c["closing"] = int((close_dt - departure_base).total_seconds() / 60)
        if e.deadline:
            c["latest"] = _time_to_minutes(e.deadline, departure_base)
        elif deadline_minutes is not None:
            c["latest"] = deadline_minutes
        if e.priority == "high":
            c["priority_high"] = True
        constraints[i] = c
    return constraints


async def optimize(
    request: ItineraryRequest,
) -> OptimizationResult:
    """Main optimization entry point."""
    errands = request.errands
    departure_str = request.departure_time

    try:
        departure_base = datetime.fromisoformat(departure_str.replace("Z", "+00:00"))
    except Exception:
        departure_base = datetime.now()

    # Build points list: start + errands + end
    points: List[Tuple[float, float]] = []
    start_idx = 0
    end_idx = None

    if request.starting_lat is not None and request.starting_lng is not None:
        ref_lat, ref_lng = request.starting_lat, request.starting_lng
    else:
        ref_lat, ref_lng = demo_coords("default-start")
    points.append((ref_lat, ref_lng))

    for index, e in enumerate(errands):
        if e.lat is not None and e.lng is not None:
            points.append((e.lat, e.lng))
        else:
            seed = e.location_query or e.name or f"errand-{index}"
            points.append(demo_coords(seed, ref_lat, ref_lng))

    if request.final_lat is not None and request.final_lng is not None:
        points.append((request.final_lat, request.final_lng))
        end_idx = len(points) - 1
    else:
        points.append(demo_coords(request.final_destination or "final-destination", ref_lat, ref_lng))
        end_idx = len(points) - 1

    # Build travel matrix
    time_matrix, dist_matrix = await get_travel_matrix(points)

    # Build constraints
    constraints = build_constraints(errands, departure_base, request.final_arrival_deadline)

    n = len(errands)

    # Choose solver
    if n <= 10:
        result = _exhaustive_search(
            errands, time_matrix, dist_matrix, start_idx, end_idx,
            departure_base, constraints, request.vehicle_mpg, request.fuel_price,
        )
    else:
        ortools_result = _try_ortools(
            errands, time_matrix, dist_matrix, start_idx, end_idx,
            departure_base, constraints,
        )
        if ortools_result:
            order = ortools_result["order"]
            result = _evaluate_sequence(
                order, errands, time_matrix, dist_matrix, start_idx, end_idx,
                departure_base, constraints, request.vehicle_mpg, request.fuel_price,
            )
            if result is not None:
                result["solver_used"] = "ortools"
            else:
                result = _heuristic_search(
                    errands, time_matrix, dist_matrix, start_idx, end_idx,
                    departure_base, constraints, request.vehicle_mpg, request.fuel_price,
                )
        else:
            result = _heuristic_search(
                errands, time_matrix, dist_matrix, start_idx, end_idx,
                departure_base, constraints, request.vehicle_mpg, request.fuel_price,
            )

    # Build ItineraryStop objects
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

    total_travel = result.get("total_travel_duration_minutes", 0)
    total_stop = result.get("total_stop_duration_minutes", 0)
    total_dist = result.get("total_distance_miles", 0)
    status = result.get("status", "feasible")
    warnings = result.get("constraint_warnings", [])
    solver = result.get("solver_used", "unknown")

    return OptimizationResult(
        status=status,
        total_travel_duration_minutes=total_travel,
        total_stop_duration_minutes=total_stop,
        total_distance_miles=total_dist,
        stops=stops_out,
        constraint_warnings=warnings,
        solver_used=solver,
    )
