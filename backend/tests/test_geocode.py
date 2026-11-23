"""Tests for GET /api/geocode endpoint."""

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


class TestGeocodeEndpoint:
    def test_valid_query_returns_results(self):
        resp = client.get("/api/geocode", params={"q": "123 Main St, New York"})
        assert resp.status_code == 200
        body = resp.json()
        assert "results" in body
        assert isinstance(body["results"], list)
        assert len(body["results"]) >= 1

    def test_result_shape(self):
        resp = client.get("/api/geocode", params={"q": "123 Main St"})
        assert resp.status_code == 200
        result = resp.json()["results"][0]
        assert set(result.keys()) >= {"address", "lat", "lng", "verified"}
        assert result["address"] == "123 Main St"
        assert isinstance(result["lat"], float)
        assert isinstance(result["lng"], float)
        assert -90 <= result["lat"] <= 90
        assert -180 <= result["lng"] <= 180
        assert isinstance(result["verified"], bool)

    def test_verified_flag_is_bool(self):
        resp = client.get("/api/geocode", params={"q": "123 Main St"})
        assert resp.status_code == 200
        for r in resp.json()["results"]:
            assert r["verified"] in (True, False)

    def test_missing_q_422(self):
        resp = client.get("/api/geocode")
        assert resp.status_code == 422
        assert "detail" in resp.json()

    def test_empty_q_422(self):
        resp = client.get("/api/geocode", params={"q": "   "})
        assert resp.status_code == 422
