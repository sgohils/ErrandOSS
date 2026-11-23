import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_extract_fallback_without_ai_key():
    """Verify extraction works without AI credentials (fallback mode)."""
    response = client.post("/api/errands/extract", json={"text": "I need to buy groceries at Kroger and get gas"})
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "fallback"
    assert len(data["errands"]) >= 1


def test_optimize_simulated_mode():
    """Verify optimize returns simulated flag in demo mode."""
    request = {
        "errands": [
            {
                "name": "Test errand",
                "estimated_duration_minutes": 10,
                "priority": "normal",
            },
        ],
        "departure_time": "2026-11-21T12:30:00",
    }
    response = client.post("/api/optimize", json=request)
    assert response.status_code == 200
    data = response.json()
    assert "simulated" in data
