"""Phase 3 — real user accounts, Argon2id hashing, server-side sessions."""
from fastapi.testclient import TestClient

from app.main import app
from app.models import User

client = TestClient(app)

SIGNUP = {
    "email": "officer@consumer.gov.in",
    "password": "StrongPass123",
    "full_name": "A. Sharma",
    "department": "Department of Consumer Affairs",
    "jurisdiction": "Delhi (Central)",
    "employee_id": "LM-DEL-001",
}


def test_signup_creates_unverified_user(db):
    r = client.post("/api/auth/signup", json=SIGNUP)
    assert r.status_code == 201
    body = r.json()
    assert body["user"]["email"] == "officer@consumer.gov.in"
    assert body["user"]["email_verified"] is False
    assert body["user"]["account_status"] == "pending_verification"
    assert "password" not in body["user"]

    stored = db.query(User).first()
    assert stored is not None
    # Argon2id hashes start with this marker.
    assert stored.password_hash.startswith("$argon2id$")


def test_signup_normalizes_email(db):
    r = client.post(
        "/api/auth/signup", json={**SIGNUP, "email": "  Officer@Consumer.GOV.IN "}
    )
    assert r.status_code == 201
    assert r.json()["user"]["email"] == "officer@consumer.gov.in"


def test_signup_rejects_duplicate_email(db):
    client.post("/api/auth/signup", json=SIGNUP)
    r = client.post("/api/auth/signup", json=SIGNUP)
    assert r.status_code == 409
    assert "already exists" in r.json()["detail"]


def test_signup_rejects_weak_password(db):
    r = client.post(
        "/api/auth/signup", json={**SIGNUP, "password": "short"}
    )
    assert r.status_code == 422


def test_password_hash_never_returned(db):
    client.post("/api/auth/signup", json=SIGNUP)
    r = client.post(
        "/api/auth/login",
        json={"email": SIGNUP["email"], "password": SIGNUP["password"]},
    )
    assert r.status_code == 403  # unverified
    assert "password" not in r.text.lower() or "password_hash" not in r.text


def test_login_wrong_password(db):
    r = client.post("/api/auth/signup", json=SIGNUP)
    assert r.status_code == 201
    r = client.post(
        "/api/auth/login",
        json={"email": "officer@consumer.gov.in", "password": "WrongPass999"},
    )
    assert r.status_code == 401


def test_unverified_login_blocked(db):
    client.post("/api/auth/signup", json=SIGNUP)
    r = client.post(
        "/api/auth/login",
        json={"email": "officer@consumer.gov.in", "password": "StrongPass123"},
    )
    assert r.status_code == 403
    assert "verify" in r.json()["detail"].lower()


def test_login_success_sets_httponly_cookie(db):
    from tests.conftest import create_verified_user

    create_verified_user(db)
    r = client.post(
        "/api/auth/login",
        json={"email": "officer@consumer.gov.in", "password": "StrongPass123"},
    )
    assert r.status_code == 200
    assert "satyatag_session" in r.cookies


def test_me_requires_authentication(db):
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_session_survives_until_logout(db):
    from tests.conftest import create_verified_user

    create_verified_user(db)
    client.post(
        "/api/auth/login",
        json={"email": "officer@consumer.gov.in", "password": "StrongPass123"},
    )
    r = client.get("/api/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == "officer@consumer.gov.in"

    r = client.post("/api/auth/logout")
    assert r.status_code == 200
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_change_password(db):
    from tests.conftest import create_verified_user

    create_verified_user(db)
    client.post(
        "/api/auth/login",
        json={"email": "officer@consumer.gov.in", "password": "StrongPass123"},
    )
    r = client.post(
        "/api/auth/change-password",
        json={"current_password": "StrongPass123", "new_password": "NewPass456!"},
    )
    assert r.status_code == 200

    client.post("/api/auth/logout")
    r = client.post(
        "/api/auth/login",
        json={"email": "officer@consumer.gov.in", "password": "NewPass456!"},
    )
    assert r.status_code == 200


def test_change_password_wrong_current(db):
    from tests.conftest import create_verified_user

    create_verified_user(db)
    client.post(
        "/api/auth/login",
        json={"email": "officer@consumer.gov.in", "password": "StrongPass123"},
    )
    r = client.post(
        "/api/auth/change-password",
        json={"current_password": "WrongCurrent1", "new_password": "NewPass456!"},
    )
    assert r.status_code == 400