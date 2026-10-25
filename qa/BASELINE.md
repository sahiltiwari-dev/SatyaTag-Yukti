# SATYATAG — QA Baseline

Date: 2026-10-24
Inspector: Automated audit (Cline)

## Backend Tests Baseline

### Environment
- Python: 3.11+
- PostgreSQL: local Docker, port 5433
- pytest: 8.3+
- httpx: 0.27+

### Test Results (as of repository state `e39e589`)

All 9 test files exist. The following results are **expected** given the implementation.
Actual run results depend on local PostgreSQL availability.

| Test File | Tests | Status (Expected) | Notes |
|-----------|-------|-------------------|-------|
| test_health.py | 2 | PASS | Requires DB running |
| test_auth_phase3.py | 12 | PASS | Requires DB |
| test_auth_phase4.py | 11 | PASS | Requires DB |
| test_auth_phase5.py | 3 | PASS | Requires DB |
| test_inspections.py | 8 | PASS | Requires DB |
| test_evidence_e2e.py | 1 | PASS | Requires DB + disk write |
| test_analysis_phase8.py | 9 | PASS | Requires seeded legal rules |
| test_seed_demo.py | 7 | PASS | Requires DB + disk for PDFs |

**Total: ~53 individual test functions**

### BLOCKER: conftest.py destructs all data on every test run

`clean_tables` autouse fixture runs `TRUNCATE ... RESTART IDENTITY CASCADE` before every test.
This is intentional for test isolation but is a **data safety risk** if pointed at a non-test database.
Must implement safety guard (see IMPLEMENTATION_STATUS.md T-001) before running against shared DB.

## Frontend

### Type Check
```
npm run build  (runs tsc -b)
```
Expected: 0 errors (typecheck.txt exists showing prior run)

### Lint
```
npm run lint
```
Expected: warnings possible; no errors blocking build

### Build
```
npm run build
```
Expected: Vite builds to `dist/` successfully

## Integration Smoke Tests

| Test | Command | Expected |
|------|---------|----------|
| Backend up | `curl localhost:8000/` | 200, SATYATAG API |
| DB connected | `curl localhost:8000/api/health` | {"database": "ok"} |
| Frontend up | `curl localhost:5173/` | 200, HTML page |

## What Was NOT Tested

- Real Resend email delivery (console mode only)
- Real OCR/AI image analysis (simulated only)
- Browser-level E2E tests (none exist)
- Multi-user concurrent access
- Load/stress testing
- Mobile responsiveness (manual only)
