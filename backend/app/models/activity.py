"""Notifications and audit event log."""
import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Enum, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.enums import NotificationType
from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPkMixin

if TYPE_CHECKING:
    from app.models.inspection import Inspection
    from app.models.user import User


class Notification(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text)
    notification_type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notification_type"),
        nullable=False,
        default=NotificationType.SYSTEM,
    )
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    related_inspection_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("inspections.id", ondelete="CASCADE")
    )

    user: Mapped["User"] = relationship()
    inspection: Mapped[Optional["Inspection"]] = relationship()


class AuditEvent(Base, UUIDPkMixin, TimestampMixin):
    """Immutable audit trail for significant application events."""

    __tablename__ = "audit_events"

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    actor_email: Mapped[Optional[str]] = mapped_column(String(255))
    event_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    entity_type: Mapped[Optional[str]] = mapped_column(String(60))
    entity_id: Mapped[Optional[str]] = mapped_column(String(64))
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64))

    user: Mapped[Optional["User"]] = relationship()