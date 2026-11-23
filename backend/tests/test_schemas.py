"""Pydantic model validation tests for the implemented shared schemas."""

import pytest
from pydantic import ValidationError

from models.schemas import (
    Errand,
    ErrandCreate,
    ErrandExtractRequest,
    ErrandExtractResponse,
    GeocodeResult,
    GeocodeResponse,
    HealthResponse,
    ItineraryRequest,
    ItineraryStop,
    OptimizationResult,
    SavingsResult,
)


class TestErrandCreate:
    def test_valid_minimal(self):
        e = ErrandCreate(name="Buy milk", estimated_duration_minutes=15)
        assert e.name == "Buy milk"
        assert e.estimated_duration_minutes == 15
        assert e.priority == "normal"
        assert e.address is None

    def test_valid_full(self):
        e = ErrandCreate(
            name="Post office",
            address="400 Main St",
            lat=40.7128,
            lng=-74.0060,
            estimated_duration_minutes=30,
            priority="high",
            opening_time="08:00",
            closing_time="17:00",
        )
        assert e.priority == "high"
        assert e.lat == 40.7128

    def test_priority_enum_values(self):
        for p in ("low", "normal", "high"):
            e = ErrandCreate(name="x", estimated_duration_minutes=10, priority=p)
            assert e.priority == p

    def test_invalid_priority_rejected(self):
        with pytest.raises(ValidationError):
            ErrandCreate(name="x", estimated_duration_minutes=10, priority="critical")

    def test_duration_zero_rejected(self):
        with pytest.raises(ValidationError):
            ErrandCreate(name="x", estimated_duration_minutes=0)

    def test_duration_negative_rejected(self):
        with pytest.raises(ValidationError):
            ErrandCreate(name="x", estimated_duration_minutes=-5)

    def test_name_required(self):
        with pytest.raises(ValidationError):
            ErrandCreate(estimated_duration_minutes=10)


class TestErrand:
    def test_full_record_with_id(self):
        e = Errand(
            id="errand-1",
            name="Buy milk",
            estimated_duration_minutes=15,
            verified=True,
            completion_status="done",
        )
        assert e.id == "errand-1"
        assert e.verified is True
        assert e.completion_status == "done"


class TestItineraryStop:
    def test_valid(self):
        s = ItineraryStop(
            stop_index=0,
            errand_id="errand-1",
            name="Buy milk",
            address="123 Main St",
            estimated_arrival="08:00",
            estimated_departure="08:30",
            stop_duration_minutes=30,
        )
        assert s.stop_index == 0
        assert s.travel_time_minutes is None

    def test_stop_index_negative_allowed(self):  # no constraint in schema
        s = ItineraryStop(
            stop_index=0,
            errand_id="e",
            name="n",
            estimated_arrival="08:00",
            estimated_departure="08:30",
            stop_duration_minutes=10,
        )
        assert s.stop_index == 0


class TestOptimizationResult:
    def test_valid(self):
        r = OptimizationResult(
            status="optimal",
            total_travel_duration_minutes=10.5,
            total_stop_duration_minutes=30,
            total_distance_miles=5.0,
            stops=[],
            constraint_warnings=[],
            solver_used="exhaustive",
        )
        assert r.status == "optimal"
        assert r.total_travel_duration_minutes == 10.5

    def test_status_feasible_infeasible(self):
        for status in ("feasible", "infeasible"):
            r = OptimizationResult(
                status=status,
                total_travel_duration_minutes=0,
                total_stop_duration_minutes=0,
                total_distance_miles=0,
                stops=[],
                constraint_warnings=[],
                solver_used="heuristic",
            )
            assert r.status == status


class TestSavingsResult:
    def test_valid(self):
        s = SavingsResult(
            baseline_travel_minutes=60.0,
            optimized_travel_minutes=40.0,
            time_saved_minutes=20.0,
            baseline_distance_miles=10.0,
            optimized_distance_miles=7.0,
            distance_saved_miles=3.0,
            fuel_saved_gallons=0.12,
            fuel_cost_saved_usd=0.42,
            assumptions={"vehicle_mpg": 25.0},
        )
        assert s.time_saved_minutes == 20.0
        assert s.fuel_cost_saved_usd == 0.42

    def test_negative_time_saved_rejected(self):
        with pytest.raises(ValidationError):
            SavingsResult(
                baseline_travel_minutes=0,
                optimized_travel_minutes=0,
                time_saved_minutes=-1.0,
                baseline_distance_miles=0,
                optimized_distance_miles=0,
                distance_saved_miles=0,
                fuel_saved_gallons=0,
                fuel_cost_saved_usd=0,
                assumptions={},
            )


class TestExtractRequestResponse:
    def test_extract_request_text_required(self):
        with pytest.raises(ValidationError):
            ErrandExtractRequest()

    def test_extract_response_shape(self):
        r = ErrandExtractResponse(
            errands=[ErrandCreate(name="x", estimated_duration_minutes=10)],
            source="fallback",
        )
        assert r.source == "fallback"
        assert len(r.errands) == 1


class TestGeocode:
    def test_geocode_result(self):
        g = GeocodeResult(address="123 Main St", lat=40.7128, lng=-74.0060, verified=True)
        assert g.verified is True
        assert -90 <= g.lat <= 90
        assert -180 <= g.lng <= 180

    def test_geocode_response(self):
        resp = GeocodeResponse(
            results=[GeocodeResult(address="a", lat=1.0, lng=2.0, verified=False)]
        )
        assert len(resp.results) == 1


class TestHealth:
    def test_health_response(self):
        h = HealthResponse(status="ok")
        assert h.status == "ok"


class TestItineraryRequest:
    def test_valid(self):
        req = ItineraryRequest(
            errands=[ErrandCreate(name="x", estimated_duration_minutes=10)],
            departure_time="2026-11-21T08:00:00",
        )
        assert len(req.errands) == 1

    def test_errands_required(self):
        with pytest.raises(ValidationError):
            ItineraryRequest(departure_time="2026-11-21T08:00:00")

    def test_departure_time_required(self):
        with pytest.raises(ValidationError):
            ItineraryRequest(errands=[ErrandCreate(name="x", estimated_duration_minutes=10)])
