"""Phase 1 health check tests."""
from fastapi.testclient import TestClient

from app.main import app


def test_root_meta():
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "SATYATAG API"
    assert body["health"] == "/api/health"


def test_health_ok_when_database_reachable():
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    # The local PostgreSQL instance must be running for the full suite.
    assert body["database"] == "ok"