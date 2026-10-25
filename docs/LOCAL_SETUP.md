# SATYATAG — Local Setup

## Prerequisites

- Node.js 20+, npm
- Python 3.11+
- Docker Desktop (for PostgreSQL)
- Git

## 1. Clone and Install

```bash
# Frontend dependencies
cd demo
npm install

# Backend dependencies
cd backend
python -m venv .venv
.venv/Scripts/Activate.ps1   # Windows PowerShell
pip install -r requirements.txt
```

## 2. Start PostgreSQL

```powershell
cd backend
.\scripts\start-db.ps1
# Starts Docker container: satyatag-postgres on host port 5433
```

Verify: `docker ps` should show the `satyatag-postgres` container running.

## 3. Configure Backend

Create `backend/.env` (copy `.env.example`):

```env
DATABASE_URL=postgresql+psycopg://satyatag:satyatag@127.0.0.1:5433/satyatag
SECRET_KEY=dev-only-secret-key-change-me
EMAIL_MODE=console
FRONTEND_ORIGIN=http://localhost:5173
APP_ENV=development
```

## 4. Run Database Migrations

```bash
cd backend
alembic upgrade head
# Expected: 1 migration (cca2222e50aa)
```

## 5. Seed Legal Database and Demo Data

```bash
# From backend/
python scripts/seed_demo.py
# Seeds: 17 legal rules, 3 users, 6 demo inspections, compliance checks, findings, reports
```

Alternatively, call the API endpoint after login:
```
POST /api/legal/seed
```

## 6. Start the Backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
# OR use: .\scripts\start-db.ps1 (if it also starts uvicorn)
```

Verify: `curl http://localhost:8000/api/health` should return `{"status": "ok", "database": "ok"}`

## 7. Start the Frontend

```bash
cd demo
npm run dev
# Vite dev server starts on http://localhost:5173
# All /api/* requests are proxied to http://localhost:8000
```

## 8. First Login

After seeding, use the demo officer account:
- Email: `officer@consumer.gov.in`
- Password: `StrongPass123`

Or create a new account via `/signup`.
In console email mode, the OTP appears in the uvicorn log and in the signup API response as `dev_otp`.

## Common Issues

| Issue | Solution |
|-------|----------|
| `alembic.exc.OperationalError: could not connect to server` | Start PostgreSQL: `.\scripts\start-db.ps1` |
| `Module not found: Cannot load app` | Activate venv: `.venv/Scripts/Activate.ps1` |
| `CORS error in browser` | Check `FRONTEND_ORIGIN` matches Vite URL exactly |
| `403 on login` | Email not verified — check uvicorn log for `dev_otp` |
| `npm run dev` port conflict | Change Vite port in `vite.config.ts` |
