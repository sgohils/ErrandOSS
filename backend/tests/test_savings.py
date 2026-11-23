"""Tests for savings calculations (services.savings.compute_savings)."""

from models.schemas import OptimizationResult, SavingsResult
from services.savings import compute_savings


def _result(travel_minutes, distance_miles, stop_minutes=0):
    return OptimizationResult(
        status="optimal",
        total_travel_duration_minutes=travel_minutes,
        total_stop_duration_minutes=stop_minutes,
        total_distance_miles=distance_miles,
        stops=[],
        constraint_warnings=[],
        solver_used="exhaustive",
    )


class TestSavingsCalculation:
    def test_returns_savings_result(self):
        baseline = _result(60.0, 10.0)
        optimized = _result(40.0, 7.0)
        result = compute_savings(baseline, optimized)
        assert isinstance(result, SavingsResult)

    def test_all_fields_non_negative(self):
        baseline = _result(60.0, 10.0)
        optimized = _result(40.0, 7.0)
        result = compute_savings(baseline, optimized)
        assert result.time_saved_minutes >= 0
        assert result.distance_saved_miles >= 0
        assert result.fuel_saved_gallons >= 0
        assert result.fuel_cost_saved_usd >= 0

    def test_positive_savings_when_optimized_better(self):
        baseline = _result(60.0, 10.0)
        optimized = _result(40.0, 7.0)
        result = compute_savings(baseline, optimized)
        assert result.time_saved_minutes == 20.0
        assert result.distance_saved_miles == 3.0
        assert result.fuel_saved_gallons > 0
        assert result.fuel_cost_saved_usd > 0

    def test_zero_savings_when_optimized_worse(self):
        baseline = _result(40.0, 7.0)
        optimized = _result(60.0, 10.0)
        result = compute_savings(baseline, optimized)
        assert result.time_saved_minutes == 0
        assert result.distance_saved_miles == 0
        assert result.fuel_saved_gallons == 0
        assert result.fuel_cost_saved_usd == 0

    def test_fuel_cost_equals_gallons_times_price(self):
        baseline = _result(60.0, 100.0)
        optimized = _result(40.0, 50.0)
        result = compute_savings(baseline, optimized, vehicle_mpg=25.0, fuel_price=4.0)
        assert abs(result.fuel_cost_saved_usd - result.fuel_saved_gallons * 4.0) < 1e-6
        assert abs(result.fuel_saved_gallons - (100.0 - 50.0) / 25.0) < 1e-6

    def test_custom_mpg_and_price(self):
        baseline = _result(60.0, 100.0)
        optimized = _result(40.0, 50.0)
        result = compute_savings(baseline, optimized, vehicle_mpg=20.0, fuel_price=5.0)
        assert result.assumptions["vehicle_mpg"] == 20.0
        assert result.assumptions["fuel_price_per_gallon"] == 5.0

    def test_assumptions_present(self):
        baseline = _result(60.0, 10.0)
        optimized = _result(40.0, 7.0)
        result = compute_savings(baseline, optimized)
        assert "vehicle_mpg" in result.assumptions
        assert "fuel_price_per_gallon" in result.assumptions
        assert "fuel_formula" in result.assumptions
        assert "cost_formula" in result.assumptions
        assert result.assumptions["vehicle_mpg"] == 25.0
        assert result.assumptions["fuel_price_per_gallon"] == 3.50

    def test_rounding(self):
        baseline = _result(60.0, 10.0)
        optimized = _result(40.0, 7.0)
        result = compute_savings(baseline, optimized)
        assert result.distance_saved_miles == 3.0
        assert result.fuel_saved_gallons == round((10.0 - 7.0) / 25.0, 2)
