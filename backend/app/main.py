"""FastAPI application entry point.

Run from backend/ with:
    uvicorn app.main:app --reload

STARTUP SEQUENCE
----------------
1. lifespan() runs validate_production_config() — aborts if unsafe in production.
2. CORS middleware is configured with the trusted frontend origin.
3. Routers are mounted.

COOKIE SECURITY
---------------
In APP_ENV=production the session cookie is set with:
    Secure=True, HttpOnly=True, SameSite=Strict
In development, Secure=False (no HTTPS needed locally).
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    analysis, auth, dashboard, evidence, health, inspections, legal, listing,
    notifications, reports, users,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: run startup checks before accepting requests."""
    # This raises RuntimeError with a clear message if production is misconfigured.
    # It intentionally does NOT log or expose secret values.
    settings.validate_production_config()
    yield
    # Shutdown logic can go here if needed.


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "AI-Assisted Compliance support for packaged commodities "
        "(Legal Metrology). Enforcement-support system — does not replace "
        "statutory inspection."
    ),
    lifespan=lifespan,
)

# Local development CORS. Credentials (HttpOnly cookies) are allowed only
# against the configured frontend origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(inspections.router)
app.include_router(evidence.router)
app.include_router(legal.router)
app.include_router(analysis.router)
app.include_router(listing.router)
app.include_router(dashboard.router)
app.include_router(notifications.router)
app.include_router(users.router)
app.include_router(reports.router)


@app.get("/", tags=["meta"])
def root() -> dict:
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/health",
        "env": settings.app_env,
    }