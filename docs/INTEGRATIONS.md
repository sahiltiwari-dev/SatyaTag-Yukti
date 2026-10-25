# SATYATAG — Integrations

## Currently Integrated (Active)

### 1. PostgreSQL
- **Purpose**: Primary data store for all application entities
- **Connection**: `postgresql+psycopg://satyatag:satyatag@127.0.0.1:5433/satyatag` (local)
- **Driver**: psycopg 3.x (binary distribution)
- **Port**: 5433 (non-standard; avoid collision with system PostgreSQL on 5432)
- **Status**: VERIFIED — all tests run against real PostgreSQL

### 2. Email (Console Mode — local dev)
- **Purpose**: Email verification OTPs + password reset links
- **Current mode**: `email_mode=console` — emails are printed to uvicorn stdout, not sent
- **Dev helper**: Responses include `dev_otp` / `dev_reset_url` for local testing
- **Config**: `EMAIL_MODE=console` in `backend/.env`

### 3. Resend (Email — Production, BLOCKED_BY_CREDENTIAL)
- **Purpose**: Transactional email delivery (OTP, password reset)
- **Status**: Code integrated (`app/services/notifications.py`), but `RESEND_API_KEY` not configured
- **Env var**: `RESEND_API_KEY` (secret), `EMAIL_FROM` (public)
- **Account URL**: https://resend.com/signup

### 4. ReportLab
- **Purpose**: Server-side PDF report generation
- **Status**: VERIFIED — generates real PDFs under `backend/uploads/reports/`
- **Library**: `reportlab>=4.2`

## NOT Integrated (Missing / Simulated)

### 5. OCR / Computer Vision API
- **Purpose**: Extract text from product label image evidence
- **Status**: MISSING — no real OCR integrated. Analysis uses product fields entered manually.
- **Impact**: The `ocr_results` table exists but is never populated in production.
- **Candidates**: Google Cloud Vision, Azure AI Vision, Tesseract (open source)
- **Env vars needed**: TBD based on provider chosen

### 6. AI / LLM Product Data Extraction
- **Purpose**: Use a language model to extract structured fields from label text
- **Status**: MISSING — demo uses keyword-match from already-entered fields
- **Candidates**: Google Gemini, OpenAI GPT-4o, Anthropic Claude
- **Env vars needed**: TBD based on provider

### 7. Object Storage (S3 / GCS)
- **Purpose**: Production evidence image + report storage
- **Status**: NOT_APPLICABLE — current implementation uses local disk
- **Need**: Required before production deployment (local disk is lost on container restart)

### 8. Application Hosting
- **Backend**: Uvicorn behind a reverse proxy (nginx/caddy)
- **Frontend**: Static files served from `dist/` or Vite SSR
- **Status**: Configuration not finalised
