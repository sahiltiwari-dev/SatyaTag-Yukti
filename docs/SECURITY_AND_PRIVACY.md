# SATYATAG — Security and Privacy

## Authentication Security

| Control | Implementation | Status |
|---------|---------------|--------|
| Password hashing | Argon2id (via argon2-cffi) | IMPLEMENTED |
| Session tokens | `secrets.token_urlsafe(32)` (256 bits) | IMPLEMENTED |
| Session storage | SHA-256 hash in DB only; raw token in HttpOnly cookie | IMPLEMENTED |
| Cookie flags | HttpOnly, SameSite=Lax | IMPLEMENTED |
| Session TTL | 7/30 days, checked on every request | IMPLEMENTED |
| Session revocation | Logout + password reset revoke all sessions | IMPLEMENTED |
| OTP security | SHA-256 hash stored; 6-digit; 10min expiry; max 5 attempts; 60s cooldown | IMPLEMENTED |
| Password reset | Single-use token; SHA-256 hashed; 1hr TTL; revokes all sessions | IMPLEMENTED |
| Anti-enumeration | Forgot password returns same message for known/unknown emails | IMPLEMENTED |
| CORS | Credentials-allowed CORS restricted to configured frontend origin | IMPLEMENTED |

## Authorization

| Control | Implementation | Status |
|---------|---------------|--------|
| Protected routes | `get_current_user()` dependency on all /api/* except auth + health | IMPLEMENTED |
| Inspection ownership | Officers see only their own inspections; admins see all | IMPLEMENTED |
| Evidence ownership | Officers can only access evidence of their own inspections | IMPLEMENTED |
| Admin-only endpoints | `GET /api/users/{id}` requires admin role | IMPLEMENTED |
| Role-based deps | `require_roles(*roles)` factory for fine-grained control | IMPLEMENTED |

## Known Security Issues (to remediate)

### HIGH - Default secret key accepted in production
**Location**: `backend/app/config.py` line 25
**Issue**: `secret_key: str = "dev-only-secret-key-change-me"` — the application starts with no error if `SECRET_KEY` is not set in the environment.
**Remediation**: Add a startup check that raises `RuntimeError` if `app_env=production` and `secret_key` equals the default.

### HIGH - Tests run destructive TRUNCATE on the development database
**Location**: `backend/tests/conftest.py` lines 23-41
**Issue**: The `clean_tables` autouse fixture does `TRUNCATE ... RESTART IDENTITY CASCADE` on every test. This runs against whichever database `DATABASE_URL` points to. If a developer accidentally runs pytest against a non-test database, all data is destroyed.
**Remediation**: Implement a fail-closed guard that verifies the database name contains "test" before allowing TRUNCATE to proceed. See `qa/IMPLEMENTATION_STATUS.md` Task T-001.

### MEDIUM - HttpOnly cookie SameSite mode
**Location**: `backend/app/auth/dependencies.py`
**Issue**: Cookie is set with `SameSite=Lax`. For stricter CSRF protection in production consider `SameSite=Strict`.
**Status**: Acceptable for development; review before production.

### MEDIUM - No rate limiting on /api/auth/* endpoints
**Location**: All auth endpoints
**Issue**: No per-IP or per-account rate limiting on login, signup, OTP verification.
**Remediation**: Add slowapi (FastAPI rate limiter) in production.

### MEDIUM - Settings page has no backend persistence
**Location**: `src/pages/SettingsPage.tsx`
**Issue**: UI preferences are stored locally (React state) only; not persisted to server. Changes are lost on refresh.
**Status**: PARTIALLY_IMPLEMENTED

### LOW - Evidence MIME type validation trusts client-reported Content-Type
**Location**: `backend/app/routers/evidence.py` lines 66-85
**Issue**: MIME validation uses the client-provided content_type from the upload request. A malicious client could upload a non-image with an image MIME type. File extension is also checked.
**Remediation**: Use `python-magic` to detect MIME type from file bytes (magic bytes), not client header.

### LOW - Upload directory path traversal check
**Location**: `backend/app/routers/evidence.py` lines 36-42
**Status**: Path traversal check implemented (`_path_inside_root()`). Verified.

### LOW - No file size limits enforced at the OS layer
**Location**: `backend/app/config.py` `max_upload_bytes = 20MB`
**Issue**: Size is checked after reading the file into memory. Consider streaming validation.

### INFO - Demo analysis clearly marked
**Location**: All analysis endpoints return `"demo": true` and `"note": "DEMO ANALYSIS"`
**Status**: COMPLIANT with rule 6 (no silent substitution)

## Privacy

- Password hashes are never returned in API responses (verified in tests)
- Session tokens are never returned in API responses (stored as SHA-256 only)
- OTP codes are never stored in plaintext
- Audit events record actor email + event type + entity + IP address
- Evidence files are stored server-side; `imageUrl` construction references `/api/evidence/{id}/file` which enforces auth
