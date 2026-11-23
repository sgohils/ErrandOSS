"""Tests for POST /api/errands/extract endpoint."""

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


class TestExtractEndpoint:
    def test_valid_text_returns_errands(self):
        resp = client.post(
            "/api/errands/extract",
            json={"text": "Buy milk at the store\nPost office at 400 Main St"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "errands" in body
        assert "source" in body
        assert isinstance(body["errands"], list)
        assert len(body["errands"]) >= 1
        assert body["errands"][0]["name"]

    def test_demo_mode_source_is_fallback(self):
        resp = client.post("/api/errands/extract", json={"text": "Buy milk"})
        assert resp.status_code == 200
        assert resp.json()["source"] == "fallback"

    def test_urgent_maps_to_high_priority(self):
        resp = client.post(
            "/api/errands/extract", json={"text": "Call client urgently asap"}
        )
        assert resp.status_code == 200
        errands = resp.json()["errands"]
        assert any(e["priority"] == "high" for e in errands)

    def test_duration_minutes_parsed(self):
        resp = client.post(
            "/api/errands/extract", json={"text": "Dentist appointment 45 minutes"}
        )
        assert resp.status_code == 200
        errands = resp.json()["errands"]
        assert any(e["estimated_duration_minutes"] == 45 for e in errands)

    def test_time_maps_to_latest_arrival(self):
        resp = client.post(
            "/api/errands/extract", json={"text": "Dentist at 123 Elm St 09:00"}
        )
        assert resp.status_code == 200
        errands = resp.json()["errands"]
        assert any(e.get("latest_arrival") for e in errands)

    def test_empty_text_returns_manual_with_no_errands(self):
        resp = client.post("/api/errands/extract", json={"text": "   "})
        assert resp.status_code == 200
        body = resp.json()
        assert body["errands"] == []
        assert body["source"] == "manual"

    def test_missing_text_field_422(self):
        resp = client.post("/api/errands/extract", json={})
        assert resp.status_code == 422
        assert "detail" in resp.json()

    def test_response_shape(self):
        resp = client.post("/api/errands/extract", json={"text": "Buy milk"})
        assert resp.status_code == 200
        body = resp.json()
        assert set(body.keys()) == {"errands", "source"}
        for e in body["errands"]:
            assert "name" in e
            assert "priority" in e
            assert e["priority"] in ("low", "normal", "high")
            assert "estimated_duration_minutes" in e
