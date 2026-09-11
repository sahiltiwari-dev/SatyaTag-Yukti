"""FastAPI application entry point.

Run from backend/ with:
    uvicorn app.main:app --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    analysis, auth, dashboard, evidence, health, inspections, legal, listing,
    notifications, reports, users,
)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "AI-Assisted Compliance support for packaged commodities "
        "(Legal Metrology). Enforcement-support system — does not replace "
        "statutory inspection."
    ),
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
    }