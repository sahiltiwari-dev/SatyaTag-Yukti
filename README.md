# SATYATAG — AI-Assisted Compliance for Packaged Commodities

**Team:** METROLENS

SATYATAG is a professional, end-to-end compliance-support application for
enforcement of Legal Metrology requirements on packaged commodities.

> AI SEES. COMPUTER VISION MEASURES. RULES DECIDE. EVIDENCE EXPLAINS. OFFICER CONFIRMS.

SATYATAG is **enforcement-support software**. It does **not** replace statutory
inspection and does **not** make the final legally binding decision. Uncertainty is
never automatically converted into a violation — it becomes **REVIEW / MANUAL
REVIEW**, and the **authorized officer** makes the final decision.

**The only simulated part of the system is the package scanning / OCR /
computer-vision / AI extraction / automatic screening engine (operating in DEMO
mode). Everything else — authentication, database, sessions, evidence uploads,
legal database, findings, officer decisions, reports — is real.**

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS · React Router · Lucide React |
| Backend | Python · FastAPI |
| Database | PostgreSQL · SQLAlchemy (ORM) · Alembic (migrations) |
| Passwords | Argon2id |
| Email | Resend (replaceable `EmailService`) |
| Files | `backend/uploads/` (local storage) with PostgreSQL metadata |
| Reports | Server-generated A4 PDF with actual evidence images |

```
backend/
  app/
    main.py           FastAPI entry point
    config.py         settings (.env, server-side only)
    database.py       engine / session / Base
    models/           SQLAlchemy ORM models
    schemas/          Pydantic request/response models
    routers/          API route modules
    services/         business services (auth, email, demo engine, reports)
    repositories/     data access layer
    auth/             sessions & authorization
    legal/            Legal Metrology knowledge base
    reports/          PDF generation
    uploads/          evidence upload handling
  alembic/            database migrations
  uploads/            stored evidence files (gitignored)
  tests/              pytest suite
  scripts/            local PostgreSQL helper scripts
```

---

## Local development setup

Prerequisites: **Node 18+**, **Python 3.11+**, **PostgreSQL 15+** installed.

### 1. Start the local database

A user-owned PostgreSQL cluster on port **5433** (no admin rights needed):

```powershell
powershell -ExecutionPolicy Bypass -File backend\scripts\start-db.ps1
```

Create a satellite user/database if the script's `createdb` step did not run:

```powershell
psql -h 127.0.0.1 -p 5433 -U satyatag -d postgres -c "CREATE DATABASE satyatag;"
```

### 2. Configure environment

```powershell
# Backend secrets — copy and fill in values (gitignored)
copy backend\.env.example backend\.env

# Frontend API URL
copy .env.example .env
```

Required variables:

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | backend `.env` | `postgresql+psycopg://user:pass@host:port/db` |
| `SECRET_KEY` | backend `.env` | session/token signing secret |
| `RESEND_API_KEY` | backend `.env` | Resend email provider API key |
| `EMAIL_FROM` | backend `.env` | sender address for OTP/reset emails |
| `VITE_API_URL` | frontend `.env` | backend base URL (default `http://localhost:8000`) |

Backend secrets never reach the frontend.

### 3. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

alembic upgrade head           # apply migrations
python -m app.seed             # seed legal repository + demo data (later phases)
uvicorn app.main:app --reload  # http://localhost:8000
```

### 4. Frontend

```powershell
npm install
npm run dev                    # http://localhost:5173
```

### 5. Health check

```powershell
Invoke-RestMethod http://localhost:8000/api/health
# {"status":"ok","database":"ok"}
```

---

## Development process

Each phase ends with tests, TypeScript checks, a production build, and a
verification of the real workflow before moving on. See the phase plan for the
current migration status.

## Legal disclaimer

The legal repository is a **structured reference system** built from official
Department of Consumer Affairs / Legal Metrology material with preserved source
URL, retrieval date and version information. SATYATAG output is **decision
support** — the officer remains responsible for the final decision.