"""Inspection aggregate — the central persisted entity."""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.enums import (
    InspectionMode,
    InspectionStatus,
    InspectionType,
    OfficerDecision,
)
from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPkMixin

if TYPE_CHECKING:
    from app.models.classification import (
        ApplicabilityResult,
        Classification,
    )
    from app.models.compliance import ComplianceCheck, Finding
    from app.models.evidence import EvidenceAsset, ExtractedField, OCRResult
    from app.models.user import User


class Inspection(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "inspections"

    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Human-readable inspection number, e.g. SAT-2026-000123.
    inspection_number: Mapped[str] = mapped_column(
        String(40), nullable=False, unique=True
    )
    inspection_type: Mapped[InspectionType] = mapped_column(
        Enum(InspectionType, name="inspection_type"),
        nullable=False,
        default=InspectionType.ROUTINE,
    )
    mode: Mapped[InspectionMode] = mapped_column(
        Enum(InspectionMode, name="inspection_mode"),
        nullable=False,
        default=InspectionMode.PHYSICAL_PACKAGE,
    )
    location: Mapped[Optional[str]] = mapped_column(String(255))
    status: Mapped[InspectionStatus] = mapped_column(
        Enum(InspectionStatus, name="inspection_status"),
        nullable=False,
        default=InspectionStatus.DRAFT,
    )
    stage: Mapped[str] = mapped_column(String(40), nullable=False, default="IDLE")

    # Denormalised product reference (captured during setup/scanning).
    product_name: Mapped[Optional[str]] = mapped_column(String(255))
    product_brand: Mapped[Optional[str]] = mapped_column(String(120))
    manufacturer: Mapped[Optional[str]] = mapped_column(String(255))
    category: Mapped[Optional[str]] = mapped_column(String(120))
    subcategory: Mapped[Optional[str]] = mapped_column(String(120))
    barcode: Mapped[Optional[str]] = mapped_column(String(60))
    net_quantity: Mapped[Optional[str]] = mapped_column(String(40))
    mrp: Mapped[Optional[str]] = mapped_column(String(40))
    date_of_manufacture: Mapped[Optional[str]] = mapped_column(String(60))
    best_before: Mapped[Optional[str]] = mapped_column(String(60))
    country_of_origin: Mapped[Optional[str]] = mapped_column(String(120))
    common_name: Mapped[Optional[str]] = mapped_column(String(255))
    consumer_care: Mapped[Optional[str]] = mapped_column(Text)
    unit_sale_price: Mapped[Optional[str]] = mapped_column(String(40))

    # Officer decision (authoritative final status).
    officer_decision: Mapped[OfficerDecision] = mapped_column(
        Enum(OfficerDecision, name="officer_decision"),
        nullable=False,
        default=OfficerDecision.PENDING,
    )
    final_notes: Mapped[Optional[str]] = mapped_column(Text)
    decision_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    analytics_score: Mapped[Optional[float]] = mapped_column(Float)
    report_generated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    owner: Mapped["User"] = relationship(back_populates="inspections")
    evidence: Mapped[List["EvidenceAsset"]] = relationship(
        back_populates="inspection", cascade="all, delete-orphan"
    )
    ocr_results: Mapped[List["OCRResult"]] = relationship(
        back_populates="inspection", cascade="all, delete-orphan"
    )
    extracted_fields: Mapped[List["ExtractedField"]] = relationship(
        back_populates="inspection", cascade="all, delete-orphan"
    )
    classification: Mapped[Optional["Classification"]] = relationship(
        back_populates="inspection", uselist=False, cascade="all, delete-orphan"
    )
    applicability: Mapped[Optional["ApplicabilityResult"]] = relationship(
        back_populates="inspection", uselist=False, cascade="all, delete-orphan"
    )
    compliance_checks: Mapped[List["ComplianceCheck"]] = relationship(
        back_populates="inspection", cascade="all, delete-orphan"
    )
    findings: Mapped[List["Finding"]] = relationship(
        back_populates="inspection", cascade="all, delete-orphan"
    )