# SATYATAG — Product Specification

## Purpose

SATYATAG is an AI-assisted compliance enforcement-support tool for Legal Metrology officers inspecting packaged commodities and online product listings. It does NOT replace statutory inspection; it provides decision-support findings requiring officer review.

## Users and Roles

| Role | Level | Permissions |
|------|-------|-------------|
| officer | Field inspector | Own inspections only; create, edit, evidence upload, analyse, decide |
| supervisor | Team lead | All inspections; all officer permissions |
| admin | System admin | All data; user management |

## Core User Journeys

### 1. Account and Access
- Signup with email, password (Argon2id, min 8 chars), department, jurisdiction, employee ID
- OTP email verification (6-digit, SHA-256 stored, 10 min TTL, max 5 attempts, 60s resend cooldown)
- Login sets HttpOnly session cookie (7/30 days)
- Password change (current password required)
- Password reset (emailed token, single-use, 1hr TTL, revokes all sessions)
- Session revocation on logout and password reset
- Profile update (name, department, jurisdiction, designation, phone, address)

### 2. Physical Package Inspection
1. Create inspection (type, mode=Physical Package, location)
2. Scan/enter product data (name, brand, manufacturer, net_qty, MRP, DOM, best_before, origin, common_name, consumer_care, FSSAI)
3. Upload evidence images (Front/Back/Side 1/Side 2/Other surfaces, JPG/PNG/WEBP/GIF/BMP, max 20 MB, unique per surface)
4. Run analysis (POST /analyse → deterministic demo FIELD extraction + 17-rule compliance evaluation)
5. Review findings (PASS/REVIEW/VIOLATION/NOT_APPLICABLE per rule with legal citation)
6. Set per-finding officer decision (Confirmed/Needs Review/Not Established)
7. Set final inspection decision (COMPLIANT/MANUAL REVIEW/NON-COMPLIANT)
8. Generate PDF report (embedded evidence, compliance table, legal citations, SHA-256 fingerprint, disclaimer)
9. Download report

### 3. Online Listing Inspection
1. Create inspection (mode=Product Listing)
2. Add listing URL, platform, title, price, quantity, seller name
3. Run listing analysis (price vs MRP, quantity match, seller identity checks)
4. Review listing findings
5. Include in report

### 4. Supporting Features
- Dashboard: stats (total/compliant/non-compliant/pending/in-progress), trend chart, compliance rate, avg score
- Analytics: status distribution, category distribution, mode distribution, recent inspections list
- Inspection repository: list with search, status filter, mode filter, pagination
- Legal rule library: 17 rules (LM Act 2009 + PCR 2011 + 2022 Amendment), with versions and amendments
- Rule detail: rule number, title, description, category, check type, severity, version history, amendments
- Notifications: per-user inbox, mark read/unread, unread count
- Audit trail: every significant event logged (account creation, login, inspection CRUD, analysis, decisions, reports)
- User profile: update name, department, designation, phone, address
- Settings: UI preferences (no backend persistence currently)

## Analysis Engine (Current Implementation)

Status: **DEMO/SIMULATED** — the analysis engine is deterministic, not AI/OCR based.

The `/api/inspections/{id}/analyse` endpoint:
1. Reads the inspection’s existing product fields (entered during setup/scan, not read from image)
2. Runs a keyword-matching rule applicability check against 17 legal rules
3. For each applicable rule, checks presence/value of the corresponding extracted field
4. Raises PASS, REVIEW, VIOLATION, or NOT_APPLICABLE per rule
5. Creates ComplianceCheck and Finding rows in PostgreSQL
6. Returns analytics score (% PASS) and summary

Real OCR/AI image analysis is NOT integrated. The `ocr_results` table exists in the schema but no real CV pipeline populates it.
