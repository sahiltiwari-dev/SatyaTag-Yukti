"""Audit trail helper — writes immutable AuditEvent rows."""
from typing import Optional

from sqlalchemy.orm import Session

from app.models.activity import AuditEvent


def record_audit(
    db: Session,
    event_type: str,
    actor_id: Optional[object] = None,
    actor_email: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    metadata: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> AuditEvent:
    event = AuditEvent(
        user_id=actor_id,
        actor_email=actor_email,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        metadata_json=metadata,
        ip_address=ip_address,
    )
    db.add(event)
    db.flush()
    return event