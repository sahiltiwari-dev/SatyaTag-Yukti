# SATYATAG — Acceptance Criteria

## AC-01: User Registration and Email Verification

- [ ] User can sign up with email, password (min 8 chars), full name
- [ ] Duplicate email is rejected with 409
- [ ] Account created with status=pending_verification
- [ ] OTP sent (console log in dev mode, Resend in production)
- [ ] OTP verifies account → status=active
- [ ] Wrong OTP decrements attempts counter (shown to user)
- [ ] 5 wrong OTPs blocks verification
- [ ] Expired OTP (>10min) is rejected
- [ ] 60-second resend cooldown enforced
- [ ] Unverified account cannot log in

## AC-02: Authentication

- [ ] Verified user can log in with correct password
- [ ] Wrong password returns 401
- [ ] Login sets HttpOnly `satyatag_session` cookie
- [ ] Session persists until logout or password reset
- [ ] /me returns user data when authenticated
- [ ] /me returns 401 when not authenticated
- [ ] Logout revokes session
- [ ] Password change requires correct current password
- [ ] Password reset (forgot password) sends reset link
- [ ] Reset link is single-use
- [ ] Password reset revokes all active sessions
- [ ] Forgot password response is identical for known/unknown emails (anti-enumeration)

## AC-03: Inspection CRUD

- [ ] Create inspection creates a SAT-{year}-{seq} number
- [ ] Inspection persisted in PostgreSQL
- [ ] Officers see only their own inspections
- [ ] Admin/supervisor can see all inspections
- [ ] Inspection can be retrieved after session refresh
- [ ] Inspection fields can be updated via PATCH
- [ ] Inspection can be deleted
- [ ] Officer decision can be set (COMPLIANT/MANUAL REVIEW/NON-COMPLIANT)
- [ ] Decision date is recorded

## AC-04: Evidence Upload

- [ ] Images (JPG, PNG, WEBP, GIF, BMP) upload successfully
- [ ] SHA-256 hash matches file content
- [ ] File is retrievable at /api/evidence/{id}/file with correct bytes
- [ ] Re-upload to same surface replaces existing evidence (same row ID)
- [ ] PDF, executable and text files are rejected
- [ ] Size limit (20MB) enforced
- [ ] Evidence is only accessible to the inspection owner
- [ ] Deleted evidence file is removed from disk

## AC-05: Analysis (Demo Mode)

- [ ] POST /analyse returns demo:true with DEMO ANALYSIS note
- [ ] Analysis produces compliance checks and findings in DB
- [ ] Missing mandatory fields produce VIOLATION outcomes
- [ ] Re-running analysis is idempotent (same check count)
- [ ] Analysis score reflects PASS percentage
- [ ] Findings can receive officer decision (Confirmed/Needs Review/Not Established)

## AC-06: Legal Rules

- [ ] GET /api/legal/rules returns at least 17 rules after seeding
- [ ] Each rule has at least 1 version
- [ ] Rules can be filtered by category, severity, check_type
- [ ] Rule detail includes versions and amendments
- [ ] Seed endpoint is idempotent (does not duplicate if already seeded)

## AC-07: Reports

- [ ] POST /report generates a PDF file
- [ ] PDF is downloadable and starts with %PDF-
- [ ] PDF checksum (SHA-256) is recorded in report_metadata
- [ ] Multiple reports can be generated for same inspection
- [ ] Report metadata lists all generated reports for an inspection

## AC-08: Listing Analysis

- [ ] Listing check can be created with URL, price, quantity, seller
- [ ] Listing analysis detects price > MRP as an issue
- [ ] Listing analysis detects missing quantity declaration
- [ ] Listing analysis detects missing seller identity

## AC-09: Dashboard and Analytics

- [ ] Dashboard stats reflect real inspection counts from DB
- [ ] Analytics overview returns status/category/mode distributions
- [ ] Stats respect RBAC (officer sees own, admin sees all)

## AC-10: Notifications and Audit

- [ ] Notifications created after analysis completion
- [ ] Mark-read and mark-all-read work correctly
- [ ] Unread count is accurate
- [ ] Audit trail records ACCOUNT_CREATED, LOGIN, INSPECTION_CREATED, EVIDENCE_UPLOADED,
      ANALYSIS_RUN, OFFICER_DECISION_SET, REPORT_GENERATED

## AC-11: Profile

- [ ] Profile page shows current user data from backend
- [ ] Profile can be updated (name, department, designation, phone, address)
- [ ] Session list shows active sessions

## NOT YET ACCEPTED

- [ ] Real OCR/AI integration
- [ ] Frontend automated (Playwright/Cypress) tests
- [ ] Settings persistence (backend)
- [ ] Rate limiting on auth endpoints
- [ ] File type detection via magic bytes (not client MIME)
- [ ] Production secret key enforcement
- [ ] Database safety guard (test-only TRUNCATE protection)
