"""Notifications and audit trail routes."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.activity import AuditEvent, Notification
from app.models.user import User

router = APIRouter(prefix="/api", tags=["notifications"])


def _notif_dict(n: Notification) -> dict:
    return {
        "id": str(n.id), "title": n.title, "body": n.body,
        "type": n.notification_type.value,
        "is_read": n.is_read,
        "related_inspection_id": str(n.related_inspection_id) if n.related_inspection_id else None,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------


@router.get("/notifications")
def list_notifications(
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
):
    items = db.query(Notification).filter(Notification.user_id == user.id).order_by(
        Notification.created_at.desc()
    ).limit(limit).all()
    unread = db.query(Notification).filter(
        Notification.user_id == user.id, Notification.is_read.is_(False)
    ).count()
    return {
        "items": [_notif_dict(n) for n in items],
        "unread_count": unread,
    }


@router.post("/notifications/{notification_id}/read")
def mark_read(notification_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    n = db.query(Notification).filter(
        Notification.id == notification_id, Notification.user_id == user.id,
    ).first()
    if not n:
        raise HTTPException(404, "Notification not found.")
    n.is_read = True
    db.commit()
    return _notif_dict(n)


@router.post("/notifications/read-all")
def mark_all_read(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    count = db.query(Notification).filter(
        Notification.user_id == user.id, Notification.is_read.is_(False),
    ).update({"is_read": True})
    db.commit()
    return {"updated": count}


# ---------------------------------------------------------------------------
# Audit trail
# ---------------------------------------------------------------------------


@router.get("/audit")
def list_audit(
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
    event_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0),
):
    q = db.query(AuditEvent).options(joinedload(AuditEvent.user))
    if user.role.value != "admin":
        q = q.filter(
            (AuditEvent.user_id == user.id) | (AuditEvent.actor_email == user.email)
        )
    if event_type:
        q = q.filter(AuditEvent.event_type == event_type)
    total = q.count()
    items = q.order_by(AuditEvent.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "items": [
            {
                "id": str(e.id), "event_type": e.event_type,
                "actor_email": e.actor_email, "entity_type": e.entity_type,
                "entity_id": e.entity_id, "metadata": e.metadata_json,
                "ip_address": e.ip_address,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in items
        ],
        "total": total, "limit": limit, "offset": offset,
    }


@router.get("/audit/event-types")
def audit_event_types(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from sqlalchemy import distinct
    return [t[0] for t in db.query(distinct(AuditEvent.event_type)).all() if t[0]]