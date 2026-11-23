"""Tests for POST /api/optimize endpoint."""

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

_VALID_REQUEST = {
    "errands": [
        {"name": "Buy milk", "address": "123 Main St", "estimated_duration_minutes": 15, "priority": "normal"},
        {"name": "Post office", "address": "400 Main St", "estimated_duration_minutes": 20, "priority": "normal"},
    ],
    "departure_time": "2026-11-21T08:00:00",
}


class TestOptimizeEndpoint:
    def test_valid_request_returns_result(self):
        resp = client.post("/api/optimize", json=_VALID_REQUEST)
        assert resp.status_code == 200
        body = resp.json()
        assert set(body.keys()) >= {"result", "baseline", "savings", "simulated"}
        assert body["simulated"] is True
        result = body["result"]
        assert result["status"] in ("optimal", "feasible", "infeasible")
        assert isinstance(result["stops"], list)
        assert result["total_travel_duration_minutes"] >= 0
        assert result["total_distance_miles"] >= 0
        assert isinstance(result["constraint_warnings"], list)
        assert "solver_used" in result

    def test_result_stops_have_sequential_indices(self):
        resp = client.post("/api/optimize", json=_VALID_REQUEST)
        assert resp.status_code == 200
        stops = resp.json()["result"]["stops"]
        indices = [s["stop_index"] for s in stops]
        assert indices == list(range(len(indices)))
        for s in stops:
            assert set(s.keys()) >= {
                "stop_index",
                "errand_id",
                "name",
                "estimated_arrival",
                "estimated_departure",
                "stop_duration_minutes",
            }

    def test_savings_shape(self):
        resp = client.post("/api/optimize", json=_VALID_REQUEST)
        assert resp.status_code == 200
        savings = resp.json()["savings"]
        assert set(savings.keys()) >= {
            "baseline_travel_minutes",
            "optimized_travel_minutes",
            "time_saved_minutes",
            "baseline_distance_miles",
            "optimized_distance_miles",
            "distance_saved_miles",
            "fuel_saved_gallons",
            "fuel_cost_saved_usd",
            "assumptions",
        }
        assert savings["time_saved_minutes"] >= 0
        assert savings["fuel_cost_saved_usd"] >= 0

    def test_empty_errands_rejected(self):
        resp = client.post(
            "/api/optimize",
            json={"errands": [], "departure_time": "2026-11-21T08:00:00"},
        )
        assert resp.status_code == 422

    def test_missing_departure_time_rejected(self):
        resp = client.post("/api/optimize", json={"errands": [{"name": "x", "estimated_duration_minutes": 10}]})
        assert resp.status_code == 422

    def test_missing_body_422(self):
        resp = client.post("/api/optimize", json={})
        assert resp.status_code == 422

    def test_infeasible_closing_time(self):
        req = dict(_VALID_REQUEST)
        req["errands"] = [
            {"name": "Early shop", "address": "1 Main St", "estimated_duration_minutes": 30, "closing_time": "08:01"}
        ]
        resp = client.post("/api/optimize", json=req)
        assert resp.status_code == 200
        result = resp.json()["result"]
        assert result["status"] == "infeasible"
        assert result["stops"] == []
        assert len(result["constraint_warnings"]) > 0

    def test_error_returns_detail_shape(self):
        resp = client.post("/api/optimize", json={"errands": []})
        assert resp.status_code == 422
        assert "detail" in resp.json()
