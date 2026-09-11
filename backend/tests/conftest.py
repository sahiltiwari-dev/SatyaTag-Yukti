"""Test configuration.

The app reads backend/.env so pytest can simply be run from backend/.
Tests that need a database use the configured local PostgreSQL instance.
"""
import os
import sys

import pytest
from sqlalchemy import text

# Ensure `app` is importable when pytest runs from the backend/ directory.
BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.auth.security import hash_password  # noqa: E402
from app.database import SessionLocal, engine  # noqa: E402
from app.models.enums import AccountStatus  # noqa: E402
from app.models.user import User, UserProfile  # noqa: E402


@pytest.fixture(autouse=True)
def clean_tables():
    """Wipes test-influenced rows before every test for deterministic results.

    Runs against the local development database (documented setup).
    """
    with engine.begin() as conn:
        conn.execute(
            text(
                "TRUNCATE TABLE sessions, email_verifications, "
                "password_reset_tokens, audit_events, user_profiles, "
                "report_metadata, officer_decisions, findings, "
                "compliance_checks, listing_analyses, listing_checks, "
                "applicability_results, classifications, extracted_fields, "
                "ocr_results, evidence_assets, inspections, "
                "users RESTART IDENTITY CASCADE"
            )
        )
    yield


@pytest.fixture()
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def create_verified_user(
    db,
    email="officer@consumer.gov.in",
    password="StrongPass123",
    full_name="A. Sharma",
    role="officer",
    verified=True,
) -> User:
    """Creates a user directly in the DB (optionally email-verified)."""
    user = User(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        role=role,
        department="Department of Consumer Affairs",
        jurisdiction="Delhi (Central)",
        employee_id="LM-DEL-001",
        email_verified=verified,
        account_status=(
            AccountStatus.ACTIVE if verified else AccountStatus.PENDING_VERIFICATION
        ),
    )
    db.add(user)
    db.flush()
    db.add(UserProfile(user_id=user.id))
    db.commit()
    db.refresh(user)
    return user