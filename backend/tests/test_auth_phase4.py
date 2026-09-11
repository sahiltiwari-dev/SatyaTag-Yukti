"""Phase 4 — email OTP verification and password reset (console-mail transport)."""
import re
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

from fastapi.testclient import TestClient

from app.main import app
from app.models import EmailVerification, User
from tests.conftest import create_verified_user

client = TestClient(app)

OTP_RE = re.compile(r"\b(\d{6})\b")


def capture_emails(monkeypatch):
    """Installs a fake email transport that records every message."""
    captured: list[dict] = []

    def fake_send(to, subject, text_body, html_body=None):
        captured.append({"to": to, "subject": subject, "text": text_body})

    monkeypatch.setattr("app.services.notifications.send_email", fake_send)
    return captured


def signup_client() -> None:
    r = client.post(
        "/api/auth/signup",
        json={
            "email": "officer@consumer.gov.in",
            "password": "StrongPass123",
            "full_name": "A. Sharma",
        },
    )
    assert r.status_code == 201


def request_otp(captured, email="officer@consumer.gov.in") -> str:
    r = client.post("/api/auth/resend-otp", json={"email": email})
    assert r.status_code == 200
    otp = OTP_RE.search(captured[-1]["text"]).group(1)
    assert len(otp) == 6
    return otp


def test_resend_otp_creates_hashed_code_only(db, monkeypatch):
    captured = capture_emails(monkeypatch)
    signup_client()
    request_otp(captured)

    row = db.query(EmailVerification).one()
    assert re.fullmatch(r"[0-9a-f]{64}", row.otp_hash)  # SHA-256 hex only
    for message in captured:
        assert message["to"] == "officer@consumer.gov.in"
        assert "SATYATAG" in message["subject"]


def test_email_verification_activates_account(db, monkeypatch):
    captured = capture_emails(monkeypatch)
    signup_client()
    otp = request_otp(captured)

    r = client.post(
        "/api/auth/verify-email",
        json={"email": "officer@consumer.gov.in", "otp": otp},
    )
    assert r.status_code == 200
    assert r.json()["email_verified"] is True

    user = db.query(User).filter(User.email == "officer@consumer.gov.in").one()
    assert user.email_verified is True
    assert user.account_status == "active"
    assert all(
        v.consumed_at is not None
        for v in db.query(EmailVerification).filter(
            EmailVerification.user_id == user.id
        )
    )

    # Verified account can now sign in.
    r = client.post(
        "/api/auth/login",
        json={"email": "officer@consumer.gov.in", "password": "StrongPass123"},
    )
    assert r.status_code == 200


def test_verify_email_wrong_otp_counts_down(db, monkeypatch):
    captured = capture_emails(monkeypatch)
    signup_client()
    otp = request_otp(captured)
    wrong = "000000" if otp != "000000" else "111111"

    r = client.post(
        "/api/auth/verify-email",
        json={"email": "officer@consumer.gov.in", "otp": wrong},
    )
    assert r.status_code == 400
    assert "4 attempt(s) remaining" in r.json()["detail"]


def test_verify_email_blocks_after_max_attempts(db, monkeypatch):
    captured = capture_emails(monkeypatch)
    signup_client()
    otp = request_otp(captured)
    wrong = "000000" if otp != "000000" else "111111"

    for _ in range(5):
        r = client.post(
            "/api/auth/verify-email",
            json={"email": "officer@consumer.gov.in", "otp": wrong},
        )
        assert r.status_code == 400

    r = client.post(
        "/api/auth/verify-email",
        json={"email": "officer@consumer.gov.in", "otp": otp},
    )
    assert r.status_code == 429


def test_verify_email_expired_code(db, monkeypatch):
    captured = capture_emails(monkeypatch)
    signup_client()
    otp = request_otp(captured)

    row = db.query(EmailVerification).one()
    row.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db.commit()

    r = client.post(
        "/api/auth/verify-email",
        json={"email": "officer@consumer.gov.in", "otp": otp},
    )
    assert r.status_code == 410


def test_verify_email_idempotent_for_verified_users(db, monkeypatch):
    capture_emails(monkeypatch)
    create_verified_user(db)
    r = client.post(
        "/api/auth/verify-email",
        json={"email": "officer@consumer.gov.in", "otp": "123456"},
    )
    assert r.status_code == 200
    assert r.json()["message"] == "Email already verified."


def test_resend_otp_conflicts_when_already_verified(db):
    create_verified_user(db)
    r = client.post("/api/auth/resend-otp", json={"email": "officer@consumer.gov.in"})
    assert r.status_code == 409


def test_resend_otp_cooldown(db, monkeypatch):
    captured = capture_emails(monkeypatch)
    signup_client()
    request_otp(captured)
    r = client.post("/api/auth/resend-otp", json={"email": "officer@consumer.gov.in"})
    assert r.status_code == 200
    body = r.json()
    assert body["cooldown_seconds"] is not None
    assert 1 <= body["cooldown_seconds"] <= 60


def test_forgot_password_sends_reset_link(db, monkeypatch):
    captured = capture_emails(monkeypatch)
    create_verified_user(db)
    r = client.post(
        "/api/auth/forgot-password", json={"email": "officer@consumer.gov.in"}
    )
    assert r.status_code == 200
    assert "if an account exists" in r.json()["message"].lower()

    reset_url = re.search(r"(http\S+)", captured[-1]["text"]).group(1)
    assert "token=" in reset_url and "email=" in reset_url


def test_reset_password_works_and_revokes_sessions(db, monkeypatch):
    captured = capture_emails(monkeypatch)
    create_verified_user(db)
    client.post(
        "/api/auth/login",
        json={"email": "officer@consumer.gov.in", "password": "StrongPass123"},
    )
    assert client.get("/api/auth/me").status_code == 200

    client.post("/api/auth/forgot-password", json={"email": "officer@consumer.gov.in"})
    reset_url = re.search(r"(http\S+)", captured[-1]["text"]).group(1)
    token = parse_qs(urlparse(reset_url).query)["token"][0]

    r = client.post(
        "/api/auth/reset-password",
        json={
            "email": "officer@consumer.gov.in",
            "token": token,
            "new_password": "FreshPass789",
        },
    )
    assert r.status_code == 200

    # Old session is dead after the reset…
    assert client.get("/api/auth/me").status_code == 401
    # …old password dead …
    r = client.post(
        "/api/auth/login",
        json={"email": "officer@consumer.gov.in", "password": "StrongPass123"},
    )
    assert r.status_code == 401
    # …new password works.
    r = client.post(
        "/api/auth/login",
        json={"email": "officer@consumer.gov.in", "password": "FreshPass789"},
    )
    assert r.status_code == 200


def test_reset_token_single_use(db, monkeypatch):
    captured = capture_emails(monkeypatch)
    create_verified_user(db)
    client.post("/api/auth/forgot-password", json={"email": "officer@consumer.gov.in"})
    token = re.search(r"token=([^&\s]+)", captured[-1]["text"]).group(1)

    payload = {
        "email": "officer@consumer.gov.in",
        "token": token,
        "new_password": "FreshPass789",
    }
    assert client.post("/api/auth/reset-password", json=payload).status_code == 200
    assert client.post("/api/auth/reset-password", json=payload).status_code == 400


def test_forgot_password_does_not_leak_existence(db):
    known = client.post(
        "/api/auth/forgot-password", json={"email": "officer@consumer.gov.in"}
    ).json()
    unknown = client.post(
        "/api/auth/forgot-password", json={"email": "nobody@example.com"}
    ).json()
    assert known == unknown


def test_reset_password_rejects_bad_link(db):
    create_verified_user(db)
    r = client.post(
        "/api/auth/reset-password",
        json={
            "email": "officer@consumer.gov.in",
            "token": "not-a-real-token",
            "new_password": "FreshPass789",
        },
    )
    assert r.status_code == 400