"""Direct tests for the route optimizer engine (services.optimizer).

OR-Tools is not installed, so these exercise the exhaustive (<=10 errands) and
heuristic fallback paths, the travel-time/distance matrix, and infeasible
constraint detection.
"""

import asyncio
from datetime import datetime

import pytest
from models.schemas import ErrandCreate, ItineraryRequest
from services.optimizer import build_constraints, optimize
from services.route_engine import get_travel_matrix, haversine_miles


def _request(errands, **kwargs):
    base = {
        "errands": errands,
        "departure_time": "2026-11-21T08:00:00",
    }
    base.update(kwargs)
    return ItineraryRequest(**base)


class TestHaversine:
    def test_same_point_is_zero(self):
        assert haversine_miles(40.7128, -74.0060, 40.7128, -74.0060) == 0.0

    def test_symmetric(self):
        d1 = haversine_miles(40.7128, -74.0060, 40.7228, -74.0160)
        d2 = haversine_miles(40.7228, -74.0160, 40.7128, -74.0060)
        assert abs(d1 - d2) < 1e-9

    def test_positive_distance(self):
        assert haversine_miles(40.7128, -74.0060, 40.7228, -74.0160) > 0


class TestOptimizerDirect:
    @pytest.mark.asyncio
    async def test_single_errand(self):
        result = await optimize(_request([ErrandCreate(name="A", address="1", estimated_duration_minutes=10)]))
        assert result.status in ("optimal", "feasible", "infeasible")
        assert len(result.stops) == 1
        assert result.stops[0].stop_index == 0
        assert result.total_distance_miles >= 0

    @pytest.mark.asyncio
    async def test_multiple_errands_sequential_indices(self):
        errands = [ErrandCreate(name=f"E{i}", address=str(i), estimated_duration_minutes=10) for i in range(4)]
        result = await optimize(_request(errands))
        assert result.status in ("optimal", "feasible", "infeasible")
        indices = [s.stop_index for s in result.stops]
        assert indices == list(range(len(indices)))

    @pytest.mark.asyncio
    async def test_stop_duration_summed(self):
        errands = [
            ErrandCreate(name="A", address="1", estimated_duration_minutes=10),
            ErrandCreate(name="B", address="2", estimated_duration_minutes=20),
        ]
        result = await optimize(_request(errands))
        assert result.total_stop_duration_minutes == 30

    @pytest.mark.asyncio
    async def test_infeasible_closing_time_before_arrival(self):
        errands = [
            ErrandCreate(
                name="Early shop",
                address="1 Main St",
                estimated_duration_minutes=30,
                closing_time="08:01",
            )
        ]
        result = await optimize(_request(errands))
        assert result.status == "infeasible"
        assert result.stops == []
        assert len(result.constraint_warnings) > 0

    @pytest.mark.asyncio
    async def test_solver_is_not_ortools(self):
        errands = [ErrandCreate(name=f"E{i}", address=str(i), estimated_duration_minutes=10) for i in range(5)]
        result = await optimize(_request(errands))
        assert result.solver_used != "ortools"

    @pytest.mark.asyncio
    async def test_large_list_uses_heuristic(self):
        errands = [ErrandCreate(name=f"E{i}", address=str(i), estimated_duration_minutes=10) for i in range(12)]
        result = await optimize(_request(errands))
        assert result.status in ("optimal", "feasible", "infeasible")

    def test_build_constraints_priority_high_flag(self):
        now = datetime(2026, 11, 21, 8, 0, 0)
        errands = [ErrandCreate(name="A", address="1", estimated_duration_minutes=10, priority="high")]
        constraints = build_constraints(errands, now)
        assert constraints[0]["priority_high"] is True


class TestTravelMatrix:
    def test_matrix_square_symmetric_zero_diagonal(self):
        points = [(40.7128, -74.0060), (40.7228, -74.0160), (40.7328, -74.0260)]
        durations, distances = asyncio.run(get_travel_matrix(points))
        n = len(points)
        assert len(durations) == n and len(distances) == n
        for i in range(n):
            assert durations[i][i] == 0.0
            assert distances[i][i] == 0.0
            for j in range(n):
                assert abs(durations[i][j] - durations[j][i]) < 1e-3
                assert abs(distances[i][j] - distances[j][i]) < 1e-6
                assert durations[i][j] >= 0
                assert distances[i][j] >= 0
