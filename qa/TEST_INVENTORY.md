# SatyaTag Test Inventory

## Phase/Function Area to Test File Mapping

| Phase | Function Area | Test File | Router |
|-------|--------------|-----------|--------|
| Phase 3 | Auth & Sessions (Argon2id, HttpOnly cookies) | test_auth_phase3.py | auth.py |
| Phase 4 | OTP verification & password reset | test_auth_phase4.py | auth.py |
| Phase 5 | Dev-mode OTP/reset echoes | test_auth_phase5.py | auth.py |
| Phase 6 | Inspection persistence (CRUD, isolation) | test_inspections.py | inspections.py |
| Phase 7 | Evidence upload/delete/replace/reject | test_evidence_e2e.py | evidence.py |
| Phase 8 | Analysis, compliance, reports, listing | test_analysis_phase8.py | analysis.py, reports.py, listing.py, dashboard.py, analytics.py, legal.py, notifications.py, users.py |
| - | Health check | test_health.py | health.py |
| - | Legal DB seeding | test_seed_demo.py | legal.py |

Total test files: 9
## Individual Test Function Inventory

### test_auth_phase3.py
| Test Function | What It Validates | Expected Status | Router |
|---------------|-------------------|-----------------|--------|
| test_signup_creates_unverified_user | Signup creates unverified user, Argon2id hash, no password leaked | 201 | auth.py |
| test_signup_normalizes_email | Email trimmed + lowercased | 201 | auth.py |
| test_signup_rejects_duplicate_email | Duplicate signup rejected | 409 | auth.py |
| test_signup_rejects_weak_password | Weak password rejected | 422 | auth.py |
| test_password_hash_never_returned | Password hash never in response | 403 | auth.py |
| test_login_wrong_password | Wrong password rejected | 401 | auth.py |
| test_unverified_login_blocked | Unverified user cannot login | 403 | auth.py |
| test_login_success_sets_httponly_cookie | Login sets satyatag_session cookie | 200 | auth.py |
| test_me_requires_authentication | /me requires auth | 401 | auth.py |
| test_session_survives_until_logout | Session valid until logout | 200→401 | auth.py |
| test_change_password | Password change works end-to-end | 200 | auth.py |
| test_change_password_wrong_current | Wrong current password rejected | 400 | auth.py |

### test_auth_phase4.py
| Test Function | What It Validates | Expected Status | Router |
|---------------|-------------------|-----------------|--------|
| test_resend_otp_creates_hashed_code_only | Resend OTP stores only SHA-256 hash in DB, sends email | 200 | auth.py |
| test_email_verification_activates_account | OTP verification activates account, allows login | 200 | auth.py |
| test_verify_email_wrong_otp_counts_down | Wrong OTP decrements attempts, returns remaining count | 400 | auth.py |
| test_verify_email_blocks_after_max_attempts | After max attempts (5), verification blocked | 400 | auth.py |
| test_verify_email_expired_otp_rejected | Expired OTP rejected | 400 | auth.py |
| test_resend_otp_cooldown | Resend OTP respects cooldown | 200 | auth.py |
| test_forgot_password_sends_reset_link | Forgot password sends reset link with token | 200 | auth.py |
| test_reset_password_works_and_revokes_sessions | Reset password works, revokes sessions | 200 | auth.py |
| test_reset_token_single_use | Reset token single-use only | 200→400 | auth.py |
| test_forgot_password_does_not_leak_existence | Forgot pwd response identical for known/unknown emails | 200 | auth.py |
| test_reset_password_rejects_bad_link | Invalid reset token rejected | 400 | auth.py |

### test_auth_phase5.py
| Test Function | What It Validates | Expected Status | Router |
|---------------|-------------------|-----------------|--------|
| test_signup_returns_dev_otp_in_console_mode | Signup returns dev_otp in console mode | 201 | auth.py |
| test_resend_otp_returns_dev_otp_in_console_mode | Resend returns dev_otp when not in cooldown | 200 | auth.py |
| test_forgot_password_returns_dev_reset_url_in_console_mode | Forgot pwd returns dev_reset_url in console mode | 200 | auth.py |

### test_inspections.py
| Test Function | What It Validates | Expected Status | Router |
|---------------|-------------------|-----------------|--------|
| test_create_requires_auth | Create inspection requires auth | 401 | inspections.py |
| test_create_inspection_persists | Inspection created in PostgreSQL, number starts with SAT- | 201 | inspections.py |
| test_list_inspections_from_postgres | List inspections from DB | 200 | inspections.py |
| test_get_inspection_after_refresh | Read single inspection from DB | 200 | inspections.py |
| test_update_inspection | Update inspection stage/location | 200 | inspections.py |
| test_ownership_isolated | Cross-user access blocked (403) | 403 | inspections.py |
| test_officer_decision_persists | Officer decision + notes persisted | 200 | inspections.py |
| test_delete_inspection | Delete → 404 on read | 204→404 | inspections.py |

### test_evidence_e2e.py
| Test Function | What It Validates | Expected Status | Router |
|---------------|-------------------|-----------------|--------|
| test_evidence_upload_retrieve_replace_delete | Full lifecycle: upload, list, download, replace, delete, MIME rejection, cross-user 403 | 201→204→404 | evidence.py |

### test_analysis_phase8.py
| Test Function | What It Validates | Expected Status | Router |
|---------------|-------------------|-----------------|--------|
| test_analysis_requires_auth | Analysis requires auth | 401 | analysis.py |
| test_analysis_runs_end_to_end | Full pipeline runs, compliance_checks, findings, classification | 200 | analysis.py |
| test_analysis_is_idempotent | Re-running produces same results | 200 | analysis.py |
| test_analysis_missing_mandatory_fields_yields_violation | Missing fields yield violations | 200 | analysis.py |
| test_finding_decision | Officer decision on findings | 200 | analysis.py |
| test_report_generation_and_download | PDF report generation/download | 200 | reports.py |
| test_listing_check_and_analysis | Listing check + analysis (MRP check) | 201→200 | listing.py |
| test_dashboard_stats_and_analytics | Dashboard stats + analytics endpoints | 200 | dashboard.py, analytics.py |
| test_legal_routes | Legal rules CRUD endpoints | 200 | legal.py |
| test_notifications_and_user_profile | Notifications + user profile endpoints | 200 | notifications.py, users.py |

### test_health.py
| Test Function | What It Validates | Expected Status | Router |
|---------------|-------------------|-----------------|--------|
| test_root_meta | Root endpoint returns API metadata | 200 | health.py |
| test_health_ok_when_database_reachable | Health check verifies database connectivity | 200 | health.py |
## Backend API Routes → Frontend Service Mapping

### Authentication (/api/auth)
- POST /api/auth/signup → src/services/auth.ts → signUp(params)
- POST /api/auth/login → src/services/auth.ts → login(email, password) (sets satyatag_session cookie)
- POST /api/auth/logout → src/services/auth.ts → logout()
- GET /api/auth/me → src/services/auth.ts → initAuth() / getCurrentUser()
- POST /api/auth/verify-otp → src/services/auth.ts → erifyOTP(email, otp)
- POST /api/auth/resend-otp → src/services/auth.ts → esendOTP(email)
- POST /api/auth/forgot-password → src/services/auth.ts → equestPasswordReset(email)
- POST /api/auth/reset-password → src/services/auth.ts → esetPassword(email, token, newPassword)
- POST /api/auth/change-password → src/services/auth.ts → changePassword(current, new)

### Inspections (/api/inspections)
- POST /api/inspections → src/services/inspections.ts → createInspection(payload)
- GET /api/inspections → src/services/inspections.ts → listInspections()
- GET /api/inspections/{id} → src/services/inspections.ts → getInspection(id)
- PATCH /api/inspections/{id} → src/services/inspections.ts → updateInspection(id, patch)
- POST /api/inspections/{id}/decision → src/services/inspections.ts → setOfficerDecision(id, decision, notes)
- DELETE /api/inspections/{id} → *not in service layer* (covered by backend tests only)
- POST /api/inspections/{id}/evidence → src/services/inspections.ts → uploadEvidence(inspectionId, file, surface)
- GET /api/inspections/{id}/evidence → *inline in upload/delete flow*
- DELETE /api/evidence/{id} → src/services/inspections.ts → deleteEvidence(evidenceId)
- GET /api/evidence/{id}/file → *imageUrl in EvidenceAsset*
- POST /api/inspections/{id}/analyse → src/services/analysis.ts → unAnalysis(inspectionId)
- GET /api/inspections/{id}/analysis → src/services/analysis.ts → getAnalysis(inspectionId)
- POST /api/inspections/{id}/findings/{findingId}/decision → src/services/analysis.ts → setFindingDecision(...)
- POST /api/inspections/{id}/report → src/services/platform.ts → generateReport(inspectionId)
- GET /api/inspections/{id}/report/metadata → src/services/platform.ts → getReportMetadata(inspectionId)
- GET/POST /api/inspections/{id}/report/download → src/services/platform.ts → openReportDownload(inspectionId)
- POST /api/inspections/{id}/listing → src/services/platform.ts → createListingCheck(inspectionId, payload)
- GET /api/inspections/{id}/listing → src/services/platform.ts → listListingChecks(inspectionId)
- POST /api/inspections/{id}/listing/{listingId}/analyse → src/services/platform.ts → nalyseListing(inspectionId, listingId)

### Legal (/api/legal)
- GET /api/legal/rules → src/services/legal.ts → listRules(params?)
- GET /api/legal/rules/{ruleId} → src/services/legal.ts → getRule(ruleId)
- GET /api/legal/documents → src/services/legal.ts → listDocuments()
- GET /api/legal/sources → src/services/legal.ts → listSources()
- GET /api/legal/categories → src/services/legal.ts → listCategories()
- POST /api/legal/seed → src/services/legal.ts → seedLegalDatabase()

### Dashboard (/api/dashboard)
- GET /api/dashboard/stats → src/services/platform.ts → getDashboardStats()

### Analytics (/api/analytics)
- GET /api/analytics/overview → src/services/platform.ts → getAnalytics(days?)

### Notifications (/api/notifications)
- GET /api/notifications → src/services/platform.ts → getNotifications()
- POST /api/notifications/{id}/read → src/services/platform.ts → markNotificationRead(id)
- POST /api/notifications/read-all → src/services/platform.ts → markAllNotificationsRead()

### Audit (/api/audit)
- GET /api/audit → src/services/platform.ts → getAuditLog(params?)

### Users (/api/users)
- GET /api/users/me → src/services/platform.ts → getMyProfile()
- PATCH /api/users/me → src/services/platform.ts → updateMyProfile(patch)
- GET /api/users/me/sessions → src/services/platform.ts → getSessions()

### Health (/health)
- GET /health → *not in service layer*

## Frontend Service Modules Inventory

### src/services/api.ts (shared fetch helpers)
| Function | Description |
|----------|-------------|
| apiRequest<T>(path, options?) | JSON fetch with credentials:include, parses errors |
| apiForm<T>(path, formData) | multipart/form-data POST |
| apiRaw(path, options?) | Binary/raw fetch for downloads |
| openDownload(url, filename?) | Triggers browser download via anchor click |
| class ApiError | Typed error with `.status` code |

### src/services/auth.ts
| Function | Backend Route | Description |
|----------|--------------|-------------|
| initAuth() | GET /api/auth/me | Restore session on boot |
| getCurrentUser() | (local cache) | Returns cached UserAccount |
| isAuthenticated() | (local cache) | Boolean |
| login(email, pwd, rememberMe?) | POST /api/auth/login | Returns AuthResult |
| logout() | POST /api/auth/logout | Revokes session cookie |
| signUp(params) | POST /api/auth/signup | Returns SignupResult with dev_otp |
| verifyOTP(email, otp) | POST /api/auth/verify-email | Returns AuthResult |
| resendOTP(email) | POST /api/auth/resend-otp | Returns SignupResult with cooldown |
| requestPasswordReset(email) | POST /api/auth/forgot-password | Returns dev_reset_url |
| resetPassword(email, token, pwd) | POST /api/auth/reset-password | Returns AuthResult |
| changePassword(_, current, new) | POST /api/auth/change-password | Returns AuthResult |
| userToOfficer(account) | (local) | Maps UserAccount to Officer type |

### src/services/inspections.ts
| Function | Backend Route | Description |
|----------|--------------|-------------|
| listInspections() | GET /api/inspections | Returns Inspection[] |
| getInspection(id) | GET /api/inspections/{id} | Returns full Inspection |
| createInspection(payload) | POST /api/inspections | Returns Inspection |
| updateInspection(id, patch) | PATCH /api/inspections/{id} | Returns updated Inspection |
| setOfficerDecision(id, d, notes) | POST /api/inspections/{id}/decision | Returns Inspection |
| uploadEvidence(inspId, file, surface) | POST /api/inspections/{id}/evidence | Returns EvidenceUploadResponse |
| deleteEvidence(evidenceId) | DELETE /api/evidence/{id} | Returns void |

### src/services/analysis.ts
| Function | Backend Route | Description |
|----------|--------------|-------------|
| runAnalysis(inspectionId) | POST /api/inspections/{id}/analyse | Returns AnalysisRunResult |
| getAnalysis(inspectionId) | GET /api/inspections/{id}/analysis | Returns AnalysisDetail |
| setFindingDecision(inspId, findingId, d, notes) | POST /api/inspections/{id}/findings/{fid}/decision | Returns decision result |

### src/services/legal.ts
| Function | Backend Route | Description |
|----------|--------------|-------------|
| listRules(params?) | GET /api/legal/rules | Returns LegalRulesResponse (paginated) |
| getRule(ruleId) | GET /api/legal/rules/{id} | Returns LegalRule with versions+amendments |
| listDocuments() | GET /api/legal/documents | Returns LegalDocument[] |
| listSources() | GET /api/legal/sources | Returns LegalSource[] |
| listCategories() | GET /api/legal/categories | Returns string[] |
| seedLegalDatabase() | POST /api/legal/seed | Seeds legal rules if empty |

### src/services/platform.ts
| Function | Backend Route | Description |
|----------|--------------|-------------|
| getDashboardStats() | GET /api/dashboard/stats | Returns DashboardStats |
| getAnalytics(days?) | GET /api/analytics/overview | Returns AnalyticsOverview |
| getNotifications() | GET /api/notifications | Returns NotificationsResponse |
| markNotificationRead(id) | POST /api/notifications/{id}/read | Returns NotificationItem |
| markAllNotificationsRead() | POST /api/notifications/read-all | Returns {updated: number} |
| getAuditLog(params?) | GET /api/audit | Returns paginated AuditItem[] |
| generateReport(inspectionId) | POST /api/inspections/{id}/report | Returns GenerateReportResult |
| getReportMetadata(inspectionId) | GET /api/inspections/{id}/report/metadata | Returns ReportMetadataItem[] |
| openReportDownload(inspectionId) | GET /api/inspections/{id}/report/download | Triggers browser download |
| getMyProfile() | GET /api/users/me | Returns UserProfileResult |
| updateMyProfile(patch) | PATCH /api/users/me | Returns UserProfileResult |
| getSessions() | GET /api/users/me/sessions | Returns session list |
| createListingCheck(inspId, payload) | POST /api/inspections/{id}/listing | Returns ListingCheckResult |
| analyseListing(inspId, listingId) | POST /api/inspections/{id}/listing/{lid}/analyse | Returns analysis result |
| listListingChecks(inspId) | GET /api/inspections/{id}/listing | Returns ListingCheckResult[] |

## Gaps and Missing Coverage

### No Frontend Tests
There are NO frontend unit tests, component tests, or browser-level E2E tests.
All test coverage is backend-only (pytest + FastAPI TestClient).

### Backend Endpoints Without Frontend Service Calls
- `DELETE /api/inspections/{id}` — exists in backend + tested; NOT exposed in `inspections.ts` service layer
- `GET /api/audit/event-types` — exists in backend; NOT called from any frontend service
- `GET /api/users/{id}` (admin) — exists in backend; no frontend admin user management page

### Simulated Features (Not Real)
- OCR / Image text extraction — analysis engine reads manually entered fields only
- AI field extraction — no LLM integration

### Backend Tests Without Frontend Equivalents
- Security boundary tests (TRUNCATE isolation, ownership checks) have no browser-level counterparts

## How to Run Tests

### Backend (pytest)
```bash
cd "c:/Users/S B TIWARY/Desktop/HACK HERITAGE/WORKING DEMO/demo/backend"
.venv/Scripts/Activate.ps1
python -m pytest tests/ -v
```
Requires: PostgreSQL on port 5433, `backend/.env` configured, `alembic upgrade head` run.

WARNING: Runs TRUNCATE on every test. Only run against local test database.

### Frontend (TypeScript check + eslint)
```bash
cd "c:/Users/S B TIWARY/Desktop/HACK HERITAGE/WORKING DEMO/demo"
node_modules/.bin/tsc -b --noEmit
npm run lint
```

### Start Apps for Manual Testing
```bash
# Terminal 1: Backend
cd backend && uvicorn app.main:app --reload

# Terminal 2: Frontend
cd .. && npm run dev
# Visit http://localhost:5173
```

## Environment Summary

| Service | Local Port | Config |
|---------|-----------|--------|
| Vite (Frontend) | 5173 | npm run dev |
| FastAPI (Backend) | 8000 | uvicorn app.main:app --reload |
| PostgreSQL | 5433 | Docker container satyatag-postgres |
| Email | N/A | Console mode (prints to uvicorn log) |
| Evidence storage | N/A | backend/uploads/ (gitignored) |
| PDF reports | N/A | backend/uploads/reports/ |
