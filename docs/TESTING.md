# SATYATAG — Testing Guide

## Backend Tests

### Prerequisites
- Python venv activated
- PostgreSQL running on port 5433
- `backend/.env` configured
- All tables migrated: `alembic upgrade head`
- Legal DB and demo data seeded: `python scripts/seed_demo.py`

### Test Commands

```bash
cd backend

# All tests
.venv/Scripts/python -m pytest tests/ -v

# Specific test files
.venv/Scripts/python -m pytest tests/test_health.py -v
.venv/Scripts/python -m pytest tests/test_auth_phase3.py tests/test_auth_phase4.py tests/test_auth_phase5.py -v
.venv/Scripts/python -m pytest tests/test_inspections.py -v
.venv/Scripts/python -m pytest tests/test_evidence_e2e.py -v
.venv/Scripts/python -m pytest tests/test_analysis_phase8.py -v
.venv/Scripts/python -m pytest tests/test_seed_demo.py -v

# With coverage (if pytest-cov installed)
.venv/Scripts/python -m pytest tests/ --cov=app --cov-report=term-missing
```

### CRITICAL WARNING

The `clean_tables` autouse fixture in `conftest.py` runs `TRUNCATE ... RESTART IDENTITY CASCADE` on **every test**. This will destroy all data in the database that `DATABASE_URL` points to.

**NEVER run pytest against a production or shared database.**

Always verify `DATABASE_URL` in `backend/.env` points to your local test database before running the test suite.

See `qa/IMPLEMENTATION_STATUS.md` Task T-001 for the planned safety guard.

## Frontend Checks

```bash
cd demo

# Type checking
npx tsc -b --noEmit

# Linting
npm run lint

# Production build
npm run build
```

## Integration Smoke Test

```bash
cd backend
# With backend + DB running:
curl http://localhost:8000/api/health
# Expected: {"status": "ok", "database": "ok"}

curl http://localhost:8000/
# Expected: {"name": "SATYATAG API", "version": "0.1.0", ...}
```

## Test Coverage Summary

| Area | Test File | Coverage |
|------|-----------|----------|
| Health check | test_health.py | Full |
| Signup, login, sessions | test_auth_phase3.py | Full |
| OTP verification, password reset | test_auth_phase4.py | Full |
| Dev-mode echoes | test_auth_phase5.py | Full |
| Inspection CRUD, ownership | test_inspections.py | Full |
| Evidence upload/replace/delete/reject | test_evidence_e2e.py | Full |
| Analysis, findings, reports, listing, dashboard, legal | test_analysis_phase8.py | Most |
| Demo seed dataset integrity | test_seed_demo.py | Full |

**Missing coverage:**
- No frontend (browser/E2E) tests
- No rate limiting tests
- No production security guard tests
- No test for `GET /api/users/{id}` (admin endpoint)
- No test for `GET /api/audit/event-types`
