"""Seed demo accounts for local development.

Creates the three users used by the LoginPage "Development Quick Sign-In":

    officer@consumer.gov.in      (OFFICER)
    supervisor@consumer.gov.in   (SUPERVISOR)
    admin@consumer.gov.in        (ADMIN)

All are created email-verified / ACTIVE with the shared demo password
`demo123`. Idempotent: existing accounts are left untouched.

Run from the backend directory:
    .\\.venv\\Scripts\\python.exe -m scripts.seed_demo
"""
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.auth.security import hash_password
from app.database import SessionLocal
from app.models import User, UserProfile
from app.models.enums import AccountStatus, UserRole

DEMO_PASSWORD = "demo123"

DEMO_USERS = [
    {
        "email": "officer@consumer.gov.in",
        "full_name": "A. Sharma",
        "role": UserRole.OFFICER,
        "department": "Department of Consumer Affairs",
        "jurisdiction": "Delhi (Central)",
        "employee_id": "LM-DEL-001",
    },
    {
        "email": "supervisor@consumer.gov.in",
        "full_name": "R. Mehta",
        "role": UserRole.SUPERVISOR,
        "department": "Department of Consumer Affairs",
        "jurisdiction": "Delhi (Central)",
        "employee_id": "LM-DEL-002",
    },
    {
        "email": "admin@consumer.gov.in",
        "full_name": "S. Iyer",
        "role": UserRole.ADMIN,
        "department": "Department of Consumer Affairs",
        "jurisdiction": "All India",
        "employee_id": "LM-ADM-001",
    },
]


def main() -> None:
    db = SessionLocal()
    created = 0
    try:
        for spec in DEMO_USERS:
            exists = db.query(User).filter(User.email == spec["email"]).first()
            if exists:
                print(f"exists  : {spec['email']}")
                continue
            user = User(
                email=spec["email"],
                password_hash=hash_password(DEMO_PASSWORD),
                full_name=spec["full_name"],
                role=spec["role"],
                department=spec["department"],
                jurisdiction=spec["jurisdiction"],
                employee_id=spec["employee_id"],
                email_verified=True,
                account_status=AccountStatus.ACTIVE,
            )
            db.add(user)
            db.flush()
            db.add(UserProfile(user_id=user.id))
            created += 1
            print(f"created : {spec['email']} ({spec['role'].value})")
        db.commit()
    finally:
        db.close()
    print(f"Done — {created} demo account(s), shared password: {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()