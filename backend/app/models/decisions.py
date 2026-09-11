"""Authoritative officer decisions and report metadata."""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.enums import OfficerDecision
from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPkMixin

if TYPE_CHECKING:
    from app.models.inspection import Inspection
    from app.models.user import User


class OfficerDecision(Base, UUIDPkMixin, TimestampMixin):
    """Authoritative final officer decision for an inspection."""

    __tablename__ = "officer_decisions"

    inspection_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    officer_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    decision: Mapped[OfficerDecision] = mapped_column(
        Enum(OfficerDecision, name="officer_decision_enum"), nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(Text)
    previous_decision: Mapped[Optional[str]] = mapped_column(String(40))
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    inspection: Mapped["Inspection"] = relationship()
    officer: Mapped["User"] = relationship()


class ReportMetadata(Base, UUIDPkMixin, TimestampMixin):
    """Record of each generated PDF report."""

    __tablename__ = "report_metadata"

    inspection_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False, index=True
    )
    generated_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[Optional[str]] = mapped_column(String(512))
    file_size: Mapped[Optional[int]]
    checksum: Mapped[Optional[str]] = mapped_column(String(64))
    decision_at_generation: Mapped[Optional[str]] = mapped_column(String(40))
    generated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    inspection: Mapped["Inspection"] = relationship()
    user: Mapped["User"] = relationship()