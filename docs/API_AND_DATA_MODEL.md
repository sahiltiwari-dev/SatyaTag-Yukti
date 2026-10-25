# SATYATAG — API and Data Model

## Core API Patterns

- All auth: `/api/auth/*`
- All inspection CRUD: `/api/inspections/*`
- Evidence: `/api/inspections/{id}/evidence`, `/api/evidence/{id}/file`, `DELETE /api/evidence/{id}`
- Analysis: `POST /api/inspections/{id}/analyse`, `GET /api/inspections/{id}/analysis`
- Finding decision: `POST /api/inspections/{id}/findings/{fid}/decision`
- Listing: `/api/inspections/{id}/listing`, `/api/inspections/{id}/listing/{lid}/analyse`
- Legal: `/api/legal/rules`, `/api/legal/documents`, `/api/legal/sources`, `/api/legal/categories`, `POST /api/legal/seed`
- Dashboard: `GET /api/dashboard/stats`, `GET /api/analytics/overview`
- Notifications: `GET /api/notifications`, `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all`
- Audit: `GET /api/audit`, `GET /api/audit/event-types`
- Reports: `POST /api/inspections/{id}/report`, `GET /api/inspections/{id}/report/download`, `GET /api/inspections/{id}/report/metadata`
- Users: `GET /api/users/me`, `PATCH /api/users/me`, `GET /api/users/me/sessions`, `GET /api/users/{id}` (admin)
- Health: `GET /api/health`

## Key Request / Response Shapes

### POST /api/auth/signup
**Request:**
```json
{ "email": "...", "password": "...", "full_name": "...",
  "department": "...", "jurisdiction": "...", "employee_id": "..." }
```
**Response 201:**
```json
{ "user": {...UserOut}, "message": "...", "masked_email": "o***r@...", 
  "dev_otp": "123456" }
```

### POST /api/auth/login
**Request:**
```json
{ "email": "...", "password": "...", "remember_me": false }
```
**Response 200:** `{ "user": {...UserOut} }` + Set-Cookie: satyatag_session

### POST /api/inspections
**Request:**
```json
{ "inspection_type": "Routine", "mode": "Physical Package",
  "location": "...", "product_name": "...", ... }
```
**Response 201:** Serialized inspection with nested owner, evidence, findings, etc.

### POST /api/inspections/{id}/evidence
**Request:** multipart/form-data with `file` (image) + `surface` (Front/Back/Side 1/Side 2/Other) + optional `quality_score`
**Response 201:**
```json
{ "id": "...", "surface": "Front", "sha256": "...", "file_size": 12345,
  "url": "/api/evidence/{id}/file", "quality_status": "Good" }
```

### POST /api/inspections/{id}/analyse
**Response 200:**
```json
{ "inspection_id": "...", "inspection_number": "SAT-2026-000001",
  "demo": true, "classification": {"category": "...", "subcategory": "...", "confidence": 0.92},
  "summary": {"pass": 12, "review": 2, "violation": 3, "not_applicable": 0},
  "compliance_rate": 70.6, "checks": [...] }
```

## ORM Model Key Relationships

```
User
  -> UserProfile (1:1)
  -> Session[] (1:N)
  -> EmailVerification[] (1:N)
  -> PasswordResetToken[] (1:N)
  -> Inspection[] (1:N, owner)

Inspection
  -> EvidenceAsset[] (1:N, unique per surface)
  -> ExtractedField[] (1:N)
  -> OCRResult[] (1:N)
  -> Classification (1:1)
  -> ApplicabilityResult (1:1)
  -> ComplianceCheck[] (1:N)
  -> Finding[] (1:N)
  -> ListingCheck[] (1:N)
  -> ReportMetadata[] (1:N)
  -> Notification[] (1:N)

LegalDocument
  -> LegalRule[] (1:N)
    -> LegalRuleVersion[] (1:N)
    -> LegalAmendment[] (1:N)

ComplianceCheck
  -> LegalRule (N:1)
  -> LegalRuleVersion (N:1)
  -> Finding (1:1, optional)

AuditEvent (append-only, no cascade delete)
```

## Enums

- UserRole: officer | supervisor | admin
- AccountStatus: active | disabled | pending_verification
- InspectionType: Routine | Complaint | Follow-up
- InspectionMode: Physical Package | Product Listing
- InspectionStatus: Draft | In Progress | Under Review | Manual Review | Compliant | Non-Compliant | Completed
- OfficerDecision: Pending | COMPLIANT | MANUAL REVIEW | NON-COMPLIANT
- Surface: Front | Back | Side 1 | Side 2 | Other
- QualityStatus: Good | Acceptable | Poor
- CheckOutcome: PASS | REVIEW | VIOLATION | NOT_APPLICABLE
- Severity: LOW | MEDIUM | HIGH | CRITICAL
- FindingStatus: Under Review | Potential Violation | Informational | Resolved
- FindingOfficerDecision: Pending | Confirmed | Needs Review | Not Established
- NotificationType: SYSTEM | INSPECTION | DECISION | REPORT
- ListingCheckStatus: CREATED | ANALYSED | REVIEW
- DocumentStatus: CURRENT | SUPERSEDED | FUTURE | ARCHIVED
- RuleCheckType: PRESENCE | CONSISTENCY | FORMAT | VISIBILITY | MEASUREMENT | SUFFICIENCY
- RuleSeverity: MAJOR | MINOR | INFO
- ExtractionMode: DEMO | OFFICIAL | MANUAL
