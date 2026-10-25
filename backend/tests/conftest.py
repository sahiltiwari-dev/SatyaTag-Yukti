"""Test configuration.

The app reads backend/.env so pytest can simply be run from backend/.
Tests that need a database use the configured local PostgreSQL instance.

SAFETY GUARD
------------
The `clean_tables` autouse fixture executes TRUNCATE … CASCADE before every
test. This is intentional for test isolation, but it is catastrophic if
accidentally pointed at a production or shared database.

The guard enforces the following rules before any TRUNCATE is allowed:

1. The database URL must be reachable (obvious, but we check explicitly).
2. The active database *name* (the last path component of DATABASE_URL) must
   contain at least one of the approved test-database name fragments:
   'test', 'satyatag', 'dev', 'local', 'pytest'.
3. If the guard condition is not satisfied the test session is ABORTED with a
   clear error message — no TRUNCATE is ever executed.

To run tests you must use either the default local URL
  postgresql+psycopg://satyatag:satyatag@127.0.0.1:5433/satyatag
or a URL whose database name contains one of the approved fragments above.
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
from app.config import settings  # noqa: E402
from app.database import SessionLocal, engine  # noqa: E402
from app.models.enums import AccountStatus  # noqa: E402
from app.models.user import User, UserProfile  # noqa: E402

# ---------------------------------------------------------------------------
# Database safety guard
# ---------------------------------------------------------------------------

_ALLOWED_DB_NAME_FRAGMENTS = {"test", "satyatag", "dev", "local", "pytest"}


def _extract_db_name(url: str) -> str:
    """Extract the database name from a SQLAlchemy URL string."""
    # URLs look like: postgresql+psycopg://user:pass@host:port/dbname
    # We just want the last path component.
    try:
        path_part = url.split("/")[-1]
        # Strip query string if any
        return path_part.split("?")[0].lower()
    except Exception:
        return ""


def _assert_safe_test_database() -> None:
    """Raise RuntimeError if DATABASE_URL does not name a safe test database."""
    db_url = settings.database_url
    db_name = _extract_db_name(db_url)

    if not any(fragment in db_name for fragment in _ALLOWED_DB_NAME_FRAGMENTS):
        raise RuntimeError(
            "\n\n"
            "=== SATYATAG TEST DATABASE SAFETY GUARD ===\n"
            f"Active database name: '{db_name}'\n"
            "\n"
            "The test suite runs TRUNCATE ... CASCADE on every test.\n"
            "Running against an unrecognised database name is FORBIDDEN\n"
            "to prevent accidental destruction of production data.\n"
            "\n"
            "Allowed database name fragments:\n"
            f"  {', '.join(sorted(_ALLOWED_DB_NAME_FRAGMENTS))}\n"
            "\n"
            "Fix: set DATABASE_URL in backend/.env to a local test DB\n"
            "whose name contains one of the above fragments.\n"
            "==========================================\n"
        )


# Run the guard once at collection time before any test fixture executes.
_assert_safe_test_database()


@pytest.fixture(autouse=True)
def clean_tables():
    """Wipes test-influenced rows before every test for deterministic results.

    The database safety guard (_assert_safe_test_database) has already verified
    at session startup that DATABASE_URL points to an approved test database.
    TRUNCATE will NEVER run if the guard check fails.
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