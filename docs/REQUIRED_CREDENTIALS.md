# SATYATAG — Required Credentials

This document lists every external service and credential required by SATYATAG.
Do NOT paste real credential values anywhere other than `backend/.env` (gitignored).

---

## CHECKLIST

### #1 — PostgreSQL Database [MANDATORY — LOCAL OR HOSTED]

- **Purpose**: Primary data store (all application entities)
- **Status**: CONFIGURED (local PostgreSQL 18 on port 5433, cluster at `%LOCALAPPDATA%\satyatag\pgdata`)
- **Env vars**:
  - `DATABASE_URL=postgresql+psycopg://<user>:<password>@<host>:<port>/<dbname>` [SECRET]
- **Local setup**: Run `backend/scripts/start-db.ps1` (starts the PostgreSQL 18 cluster on port 5433)
- **Production**: Use a managed PostgreSQL service (Supabase, Neon, Railway, AWS RDS)
- **Verification**: `GET /api/health` must return `{"database": "ok"}`

### #2 — Resend API Key [REQUIRED for email delivery]

- **Purpose**: Sending OTP verification codes and password reset links
- **Status**: BLOCKED_BY_CREDENTIAL — code is ready; key not configured
- **Without it**: `email_mode=console` (OTPs appear in uvicorn log; `dev_otp` returned in API response)
- **Account URL**: https://resend.com/signup
- **API key URL**: https://resend.com/api-keys
- **Sender verification**: https://resend.com/domains (must verify sending domain)
- **Env vars**:
  - `RESEND_API_KEY=re_...` [SECRET]
  - `EMAIL_FROM=SATYATAG <no-reply@yourdomain.com>` [CONFIG]
  - `EMAIL_MODE=resend` [CONFIG] (change from "console")
- **Billing**: Free tier (3000 emails/month) sufficient for development
- **Verification**: Trigger signup, check Resend dashboard for delivered email

### #3 — OCR / Vision API [IMPLEMENTED LOCALLY via PaddleOCR]

- **Purpose**: Extract text and structured fields from product label images
- **Status**: **IMPLEMENTED & VERIFIED** (Local PaddleOCR)
- **Library / Engine**: `paddleocr` (v3.7.0) + `paddlepaddle` (v3.3.1) on Python 3.12
- **API Keys / Paid Subscriptions**: None required (runs 100% locally on CPU/GPU)
- **Env vars**: None needed
- **Implementation**: `backend/app/services/ocr.py`, integrated into evidence upload (`POST /api/inspections/{inspection_id}/evidence`). Automatically runs OCR on uploaded label images, populates `ocr_results` and `extracted_fields` tables.
- **Verification**: `pytest backend/tests/test_ocr.py` (58/58 tests passed).

### #4 — AI / LLM API [OPTIONAL for production; MISSING in current build]

- **Purpose**: Structured extraction of product data from OCR text
- **Status**: MISSING
- **Options**: Google Gemini, OpenAI, Anthropic Claude
- **Env vars**: TBD based on provider
- **Note**: Do not implement until OCR (Credential #3) is working.

### #5 — Object Storage [REQUIRED before production deployment]

- **Purpose**: Persistent storage for evidence images and PDF reports
- **Status**: NOT_APPLICABLE — currently using local disk
- **Need**: Required when deploying to cloud (local disk is ephemeral)
- **Options**: AWS S3, Google Cloud Storage, Cloudflare R2
- **Env vars**: TBD based on provider

### #6 — Secret Key (Application Sessions) [MANDATORY]

- **Purpose**: Signs / seeds session token generation (itsdangerous)
- **Status**: Default value in config — MUST be changed for production
- **Env var**: `SECRET_KEY=<random 64-char string>` [SECRET]
- **Generate**: `python -c "import secrets; print(secrets.token_hex(32))"`
- **Risk**: Using the default key in production is a HIGH severity security issue.

---

## Environment Variables Quick Reference

| Variable | Type | Required | Default | Notes |
|----------|------|----------|---------|-------|
| DATABASE_URL | SECRET | YES | local docker url | PostgreSQL connection string |
| SECRET_KEY | SECRET | YES | dev-only-... | MUST change for production |
| RESEND_API_KEY | SECRET | For email | (empty) | Resend API key |
| EMAIL_FROM | CONFIG | For email | SATYATAG <no-reply@...> | Verified sender address |
| EMAIL_MODE | CONFIG | No | console | console OR resend |
| FRONTEND_ORIGIN | CONFIG | No | http://localhost:5173 | CORS origin |
| APP_ENV | CONFIG | No | development | development OR production |
| OTP_EXPIRY_MINUTES | CONFIG | No | 10 | OTP lifetime |
| OTP_MAX_ATTEMPTS | CONFIG | No | 5 | Max OTP attempts |
| OTP_RESEND_COOLDOWN_SECONDS | CONFIG | No | 60 | Resend throttle |
| PASSWORD_RESET_EXPIRY_HOURS | CONFIG | No | 1 | Reset token lifetime |
| UPLOAD_DIR | CONFIG | No | uploads | Relative to backend/ |
| MAX_UPLOAD_BYTES | CONFIG | No | 20971520 | 20 MB |

See `backend/.env.example` for the template.
