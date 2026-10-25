"""Health check endpoint.

GET /api/health verifies backend and PostgreSQL connectivity.

Returns HTTP 200 with {"status": "ok", "database": "ok"} when healthy.
Returns HTTP 200 with {"status": "degraded", "database": "error"} when DB
is unreachable — a 200 response allows load balancers to distinguish between
app-unreachable (no HTTP response) and DB-unreachable (degraded response).
Monitoring systems should check the `database` field, not just the status code.
"""
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter(tags=["health"])


@router.get("/api/health")
def health_check(db: Session = Depends(get_db)) -> JSONResponse:
    try:
        db.execute(text("SELECT 1"))
        database = "ok"
        overall = "ok"
    except Exception:
        database = "error"
        overall = "degraded"

    return JSONResponse(
        status_code=200,  # Always 200 — check `database` field for real status.
        content={"status": overall, "database": database},
    )