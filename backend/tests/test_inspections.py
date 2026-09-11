"""Phase 6 — real inspection persistence."""
from fastapi.testclient import TestClient

from app.main import app
from app.models import Inspection

client = TestClient(app)

EMAIL = "officer@consumer.gov.in"
PASSWORD = "StrongPass123"


def login(db) -> None:
    from tests.conftest import create_verified_user

    create_verified_user(db)
    r = client.post(
        "/api/auth/login", json={"email": EMAIL, "password": PASSWORD}
    )
    assert r.status_code == 200
    assert "satyatag_session" in r.cookies


def test_create_requires_auth(db):
    r = client.post("/api/inspections", json={"mode": "Physical Package"})
    assert r.status_code == 401


def test_create_inspection_persists(db):
    login(db)
    r = client.post(
        "/api/inspections",
        json={
            "inspection_type": "Routine",
            "mode": "Physical Package",
            "location": "Retail Store, Chandni Chowk",
            "product_name": "Lay's Classic Salted",
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body["location"] == "Retail Store, Chandni Chowk"
    assert body["product_name"] == "Lay's Classic Salted"
    assert body["inspection_number"].startswith("SAT-")

    # Persisted in PostgreSQL
    stored = db.query(Inspection).first()
    assert stored is not None
    assert str(stored.id) == body["id"]
    assert stored.owner_id is not None


def test_list_inspections_from_postgres(db):
    login(db)
    client.post("/api/inspections", json={"mode": "Physical Package"})
    client.post("/api/inspections", json={"mode": "Product Listing"})
    r = client.get("/api/inspections")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


def test_get_inspection_after_refresh(db):
    login(db)
    created = client.post(
        "/api/inspections", json={"mode": "Physical Package"}
    ).json()
    # Simulates a fresh client reading directly from PostgreSQL.
    r = client.get(f"/api/inspections/{created['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == created["id"]
    assert r.json()["stage"] == "IDLE"


def test_update_inspection(db):
    login(db)
    created = client.post(
        "/api/inspections", json={"mode": "Physical Package", "stage": "SETUP"}
    ).json()
    r = client.patch(
        f"/api/inspections/{created['id']}",
        json={"stage": "SCAN", "location": "Warehouse 7"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["stage"] == "SCAN"
    assert body["location"] == "Warehouse 7"
    # Verify the write-through by re-reading from the DB
    r2 = client.get(f"/api/inspections/{created['id']}")
    assert r2.json()["stage"] == "SCAN"


def test_ownership_isolated(db):
    from tests.conftest import create_verified_user

    create_verified_user(db, email="officer@consumer.gov.in")
    client.post("/api/auth/login",
                json={"email": "officer@consumer.gov.in", "password": "StrongPass123"})
    created = client.post("/api/inspections", json={"mode": "Physical Package"}).json()
    client.post("/api/auth/logout")

    # A second officer must not be able to read or mutate the first one's record.
    create_verified_user(db, email="other@consumer.gov.in")
    client.post("/api/auth/login",
                json={"email": "other@consumer.gov.in", "password": "StrongPass123"})
    assert client.get(f"/api/inspections/{created['id']}").status_code == 403
    assert client.patch(
        f"/api/inspections/{created['id']}", json={"stage": "HACK"}
    ).status_code == 403
    r = client.get("/api/inspections")
    assert r.json()["total"] == 0


def test_officer_decision_persists(db):
    login(db)
    created = client.post("/api/inspections", json={"mode": "Physical Package"}).json()
    r = client.post(
        f"/api/inspections/{created['id']}/decision",
        json={"decision": "COMPLIANT", "notes": "Declarations verified on package."},
    )
    assert r.status_code == 200
    assert r.json()["officer_decision"] == "COMPLIANT"
    assert r.json()["final_notes"] == "Declarations verified on package."
    assert r.json()["decision_date"] is not None


def test_delete_inspection(db):
    login(db)
    created = client.post("/api/inspections", json={"mode": "Physical Package"}).json()
    r = client.delete(f"/api/inspections/{created['id']}")
    assert r.status_code == 204
    assert client.get(f"/api/inspections/{created['id']}").status_code == 404