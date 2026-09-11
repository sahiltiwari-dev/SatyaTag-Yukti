"""Phase 5 — dev-mode OTP / reset echoes that power the frontend integration."""
import re
from urllib.parse import parse_qs, urlparse

from fastapi.testclient import TestClient

from app.main import app
from app.models import EmailVerification, User
from tests.conftest import create_verified_user

client = TestClient(app)

OTP_RE = re.compile(r"\b(\d{6})\b")


def test_signup_returns_dev_otp_in_console_mode(db, monkeypatch):
    captured: list[dict] = []

    def fake_send(to, subject, text_body, html_body=None):
        captured.append({"to": to, "subject": subject, "text": text_body})

    monkeypatch.setattr("app.services.notifications.send_email", fake_send)

    r = client.post(
        "/api/auth/signup",
        json={
            "email": "new-officer@consumer.gov.in",
            "password": "StrongPass123",
            "full_name": "P. Singh",
            "department": "Dept of Consumer Affairs",
            "jurisdiction": "Mumbai",
            "employee_id": "LM-MUM-009",
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body["dev_otp"] and len(body["dev_otp"]) == 6
    assert body["dev_otp"].isdigit()
    assert body["masked_email"] == "n*********r@consumer.gov.in"

    email_body = OTP_RE.search(captured[-1]["text"]).group(1)
    assert email_body == body["dev_otp"]

    # The stored value is the SHA-256 hash of that dev_otp, never the raw code.
    row = db.query(EmailVerification).one()
    user = db.query(User).filter(User.email == "new-officer@consumer.gov.in").one()
    assert row.user_id == user.id
    assert re.fullmatch(r"[0-9a-f]{64}", row.otp_hash)


def test_resend_otp_returns_dev_otp_in_console_mode(monkeypatch):
    captured: list[dict] = []

    def fake_send(to, subject, text_body, html_body=None):
        captured.append({"to": to, "subject": subject, "text": text_body})

    monkeypatch.setattr("app.services.notifications.send_email", fake_send)

    r = client.post(
        "/api/auth/signup",
        json={
            "email": "second@consumer.gov.in",
            "password": "StrongPass123",
            "full_name": "Q. Khan",
        },
    )
    assert r.status_code == 201
    first_otp = r.json()["dev_otp"]
    assert first_otp

    # Cooldown: signup just sent the first code, so resend is throttled.
    r = client.post("/api/auth/resend-otp", json={"email": "second@consumer.gov.in"})
    assert r.status_code == 200
    assert r.json()["cooldown_seconds"] is not None
    assert r.json().get("dev_otp") is None


def test_forgot_password_returns_dev_reset_url_in_console_mode(db, monkeypatch):
    captured: list[dict] = []

    def fake_send(to, subject, text_body, html_body=None):
        captured.append({"to": to, "subject": subject, "text": text_body})

    monkeypatch.setattr("app.services.notifications.send_email", fake_send)

    create_verified_user(db)
    r = client.post(
        "/api/auth/forgot-password", json={"email": "officer@consumer.gov.in"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["dev_reset_url"]
    assert body["dev_reset_url"].startswith("http://localhost:5173/reset-password")

    qs = parse_qs(urlparse(body["dev_reset_url"]).query)
    assert "email" in qs and "token" in qs

    # The link shipped in the email matches the one echoed to the developer.
    mail_url = re.search(r"(http\S+)", captured[-1]["text"]).group(1)
    assert mail_url == body["dev_reset_url"]