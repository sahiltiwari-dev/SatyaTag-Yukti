"""Compliance checks and findings."""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.enums import (
    CheckOutcome,
    FindingOfficerDecision,
    FindingStatus,
    Severity,
)
from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPkMixin

if TYPE_CHECKING:
    from app.models.evidence import EvidenceAsset, ExtractedField
    from app.models.inspection import Inspection
    from app.models.legal import LegalRule, LegalRuleVersion


class ComplianceCheck(Base, UUIDPkMixin, TimestampMixin):
    """One rule-version check executed against an inspection's extracted data."""

    __tablename__ = "compliance_checks"

    inspection_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rule_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("legal_rules.id", ondelete="RESTRICT"), nullable=False
    )
    rule_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("legal_rule_versions.id", ondelete="RESTRICT"), nullable=False
    )
    extracted_field_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("extracted_fields.id", ondelete="SET NULL")
    )
    evidence_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("evidence_assets.id", ondelete="SET NULL")
    )
    outcome: Mapped[CheckOutcome] = mapped_column(
        Enum(CheckOutcome, name="check_outcome"), nullable=False
    )
    severity: Mapped[Severity] = mapped_column(
        Enum(Severity, name="severity"), nullable=False, default=Severity.MEDIUM
    )
    message: Mapped[Optional[str]] = mapped_column(Text)
    checked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    inspection: Mapped["Inspection"] = relationship(back_populates="compliance_checks")
    rule: Mapped["LegalRule"] = relationship()
    rule_version: Mapped["LegalRuleVersion"] = relationship()


class Finding(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "findings"

    inspection_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False, index=True
    )
    compliance_check_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("compliance_checks.id", ondelete="SET NULL"), unique=True
    )
    rule_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("legal_rules.id", ondelete="RESTRICT"), nullable=False
    )
    rule_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("legal_rule_versions.id", ondelete="RESTRICT"), nullable=False
    )
    extracted_field_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("extracted_fields.id", ondelete="SET NULL")
    )
    evidence_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("evidence_assets.id", ondelete="SET NULL")
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    finding_type: Mapped[str] = mapped_column(String(40), nullable=False, default="INFO")
    severity: Mapped[Severity] = mapped_column(
        Enum(Severity, name="finding_severity"), nullable=False, default=Severity.MEDIUM
    )
    status: Mapped[FindingStatus] = mapped_column(
        Enum(FindingStatus, name="finding_status"),
        nullable=False,
        default=FindingStatus.UNDER_REVIEW,
    )
    recommendation: Mapped[Optional[str]] = mapped_column(Text)
    officer_decision: Mapped[FindingOfficerDecision] = mapped_column(
        Enum(FindingOfficerDecision, name="finding_officer_decision"),
        nullable=False,
        default=FindingOfficerDecision.PENDING,
    )
    officer_notes: Mapped[Optional[str]] = mapped_column(Text)

    inspection: Mapped["Inspection"] = relationship(back_populates="findings")
    rule: Mapped["LegalRule"] = relationship()
    rule_version: Mapped["LegalRuleVersion"] = relationship()
    evidence: Mapped[Optional["EvidenceAsset"]] = relationship()
    extracted_field: Mapped[Optional["ExtractedField"]] = relationship()