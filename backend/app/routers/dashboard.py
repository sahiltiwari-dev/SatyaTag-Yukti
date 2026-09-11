"""Dashboard statistics and analytics routes."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.enums import UserRole
from app.models.inspection import Inspection
from app.models.user import User

router = APIRouter(prefix="/api", tags=["dashboard"])


def _visible(db: Session, user: User):
    q = db.query(Inspection)
    if user.role == UserRole.OFFICER:
        q = q.filter(Inspection.owner_id == user.id)
    return q


def _decision_count(items, decision: str) -> int:
    return sum(1 for i in items if i.officer_decision.value == decision)


@router.get("/dashboard/stats")
def dashboard_stats(
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
    days: int = Query(30, ge=1, le=365),
):
    q = _visible(db, user)
    all_items = q.all()
    total = len(all_items)
    compliant = _decision_count(all_items, "COMPLIANT")
    non_compliant = _decision_count(all_items, "NON-COMPLIANT")
    manual_review = _decision_count(all_items, "MANUAL REVIEW") + sum(
        1 for i in all_items if i.officer_decision.value == "Pending"
        and i.status.value in ("Manual Review", "Under Review")
    )
    pending = _decision_count(all_items, "Pending")
    in_progress = sum(1 for i in all_items if i.status.value in ("Draft", "In Progress"))
    completed = compliant + non_compliant

    since = datetime.now(timezone.utc) - timedelta(days=days)
    recent = [i for i in all_items if i.created_at and i.created_at >= since]
    trend = {}
    for i in recent:
        day = i.created_at.date().isoformat()
        trend[day] = trend.get(day, 0) + 1
    trend_data = [{"date": d, "count": c} for d, c in sorted(trend.items())]

    score_vals = [i.analytics_score for i in all_items if i.analytics_score is not None]
    avg_score = round(sum(score_vals) / len(score_vals), 1) if score_vals else 0.0

    return {
        "total_inspections": total,
        "compliant": compliant,
        "non_compliant": non_compliant,
        "manual_review": manual_review,
        "pending": pending,
        "in_progress": in_progress,
        "completed": completed,
        "compliance_rate": round((compliant / total) * 100, 1) if total else 0.0,
        "avg_analytics_score": avg_score,
        "trend": {"days": days, "data": trend_data},
    }


@router.get("/analytics/overview")
def analytics_overview(
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
    days: int = Query(90, ge=1, le=365),
):
    q = _visible(db, user)
    all_items = q.all()
    total = len(all_items)
    compliant = _decision_count(all_items, "COMPLIANT")
    non_compliant = _decision_count(all_items, "NON-COMPLIANT")
    manual_review = _decision_count(all_items, "MANUAL REVIEW")

    status_map = {}
    for i in all_items:
        label = i.officer_decision.value if i.officer_decision.value != "Pending" else i.status.value
        status_map[label] = status_map.get(label, 0) + 1

    category_map = {}
    mode_map = {}
    for i in all_items:
        cat = i.category or "Unclassified"
        category_map[cat] = category_map.get(cat, 0) + 1
        mode_map[i.mode.value] = mode_map.get(i.mode.value, 0) + 1

    findings = []
    for i in all_items:
        findings.append({
            "inspection_id": str(i.id), "inspection_number": i.inspection_number,
            "product": i.product_name or "Unknown", "category": i.category,
            "status": i.officer_decision.value, "score": i.analytics_score,
            "date": i.created_at.date().isoformat() if i.created_at else None,
        })

    return {
        "total_inspections": total,
        "compliance_rate": round((compliant / total) * 100, 1) if total else 0.0,
        "manual_reviews": manual_review,
        "potential_violations": non_compliant,
        "status_distribution": [{"label": k, "value": v} for k, v in status_map.items()],
        "category_distribution": [{"label": k, "value": v} for k, v in
                                   sorted(category_map.items(), key=lambda x: -x[1])[:10]],
        "mode_distribution": [{"label": k, "value": v} for k, v in mode_map.items()],
        "recent": sorted(findings, key=lambda x: x["date"] or "", reverse=True)[:200],
    }