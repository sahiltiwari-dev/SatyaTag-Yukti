# SATYATAG — Implementation Status and Backlog

Date: 2026-10-26 | Commit: e39e589

## Status Key

- DONE: Implemented and verified by tests or inspection
- PARTIAL: Partially implemented
- MISSING: Not implemented
- BLOCKED: Waiting on external credential or decision

---

## T-001 — Database Safety Guard [PRIORITY 1 — DATA SAFETY]

| Field | Value |
|-------|-------|
| Status | MISSING |
| Files | backend/tests/conftest.py, backend/app/database.py |
| Problem | `clean_tables` autouse fixture does TRUNCATE on every test. If DATABASE_URL points to a shared DB, all data is destroyed. |
| Expected | Fixture must verify DB name contains 'test' before allowing TRUNCATE. Should raise an explicit error and refuse to run if condition is not met. |
| Acceptance | pytest refuses to run if DATABASE_URL does not contain 'test'; documented in TESTING.md; test for the guard itself passes. |
| Blocker | None (can implement without external services) |

## T-002 — Production Secret Key Enforcement [PRIORITY 1 — SECURITY]

| Field | Value |
|-------|-------|
| Status | MISSING |
| Files | backend/app/config.py, backend/app/main.py |
| Problem | Default secret_key is accepted in production with no warning or error. |
| Expected | On startup, if APP_ENV=production and SECRET_KEY equals the default, raise RuntimeError before accepting connections. |
| Acceptance | Starting the server with default key + APP_ENV=production raises an error. Dev with default key starts normally. |

## T-003 — Settings Page Backend Persistence [PRIORITY 3]

| Field | Value |
|-------|-------|
| Status | PARTIAL |
| Files | src/pages/SettingsPage.tsx, backend/app/models/user.py, backend/app/routers/users.py |
| Problem | UI preferences (notifications, theme, etc.) are React state only; lost on refresh. |
| Expected | Settings stored in user_profiles table. PATCH /api/users/me accepts preference fields. |

## T-004 — Real OCR Integration [PRIORITY 2]

| Field | Value |
|-------|-------|
| Status | **DONE** |
| Files | backend/app/services/ocr.py, backend/app/routers/evidence.py, backend/tests/test_ocr.py |
| Problem | OCR was simulated. The `/analyse` endpoint read product fields entered manually, not image content. |
| Expected | Upload image -> call local PaddleOCR -> populate ExtractedField rows with real text -> run compliance engine on real data. |
| Acceptance | Local PaddleOCR processes uploaded label images, extracts MRP, net quantity, manufacturer, dates, and product name, and persists extracted fields against inspections. 58/58 backend tests passed. |
| Blocker | None (local PaddleOCR installed and operational) |

## T-005 — AI/LLM Field Extraction [PRIORITY 3]

| Field | Value |
|-------|-------|
| Status | MISSING / BLOCKED |
| Problem | No LLM extraction pipeline implemented. |
| Blocker | OCR must work first (T-004); then LLM API key needed |

## T-006 — Rate Limiting on Auth Endpoints [PRIORITY 2]

| Field | Value |
|-------|-------|
| Status | MISSING |
| Files | backend/app/routers/auth.py |
| Expected | Add slowapi or similar; limit: 10 login attempts/min per IP, 5 OTP verifications/min per email |

## T-007 — Evidence MIME Type Detection via Magic Bytes [PRIORITY 2]

| Field | Value |
|-------|-------|
| Status | PARTIAL (extension + client MIME checked; magic bytes not checked) |
| Files | backend/app/routers/evidence.py |
| Expected | Use python-magic to detect real MIME from file bytes |

## T-008 — Resend Email Integration [PRIORITY 2]

| Field | Value |
|-------|-------|
| Status | BLOCKED |
| Files | backend/app/services/notifications.py |
| Blocker | Resend API key and verified sender domain (see docs/REQUIRED_CREDENTIALS.md #2) |

## T-009 — Cloud Object Storage for Uploads [PRIORITY 3]

| Field | Value |
|-------|-------|
| Status | NOT_APPLICABLE for local dev; MISSING for production |
| Files | backend/app/routers/evidence.py, backend/app/routers/reports.py |
| Expected | Migrate disk IO to S3/GCS for production deployment |

## T-010 — Frontend E2E Tests [PRIORITY 3]

| Field | Value |
|-------|-------|
| Status | MISSING |
| Expected | Playwright or Cypress tests for critical user journeys |

## T-011 — Admin User Management UI [PRIORITY 3]

| Field | Value |
|-------|-------|
| Status | MISSING |
| Files | Backend: GET /api/users/{id} exists (admin only). Frontend: no admin user management page |

## T-012 — Inspection Deletion in Frontend Service Layer [LOW]

| Field | Value |
|-------|-------|
| Status | PARTIAL (backend DELETE endpoint exists; not exposed in src/services/inspections.ts) |
| Files | src/services/inspections.ts, src/pages/RepositoryPage.tsx |

---

## DONE (Verified)

- T-000-10: Demo seed dataset (6 inspections, 17 rules, 3 users, PDFs)
- T-000-11: **Alembic migration for user_profiles.preferences** (revision 2a9c1f5843e7) - restored missing migration with idempotent upgrade/downgrade; live DB consistent; full test suite 56/56

## RECENTLY COMPLETED (this session)

- **Missing migration restored**: The `user_profiles.preferences` column existed in live DB but was missing from migration history (revision 2a9c1f5843e7 was deleted). Created idempotent migration file with `down_revision=cca2222e50aa` and Inspector-based column guard. Verified:
  - Live DB: `alembic current` = `2a9c1f5843e7` (head), column present
  - Fresh test DB: upgrade head -> column added; downgrade -> column dropped; re-upgrade -> column re-added (idempotent)
  - Backend test suite: 56 passed

## END OF FILE
- T-000-01: Phase 1 — FastAPI foundation, health check, DB layer, config, alembic migration
- T-000-02: Phase 2 — Full 24-table ORM schema
- T-000-03: Phase 3 — Argon2id users, signup/login/logout, HttpOnly sessions, RBAC
- T-000-04: Phase 4 — Email OTP verification, cooldown/throttle, password reset (console transport)
- T-000-05: Phase 5 — Dev-mode OTP/reset echoes for frontend integration
- T-000-06: Phase 6 — Inspection CRUD, ownership isolation, officer decisions
- T-000-07: Phase 7 — Evidence upload/replace/delete/reject pipeline
- T-000-08: Phase 8 — Demo analysis engine, compliance checks, findings, PDF reports, listing analysis, dashboard, analytics, legal library, notifications, audit trail
- T-000-09: Frontend wired to real FastAPI backend with session cookie flow
- T-000-10: Demo seed dataset (6 inspections, 17 rules, 3 users, PDFs)
