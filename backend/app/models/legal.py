"""Legal Metrology knowledge base models.

The legal database is a structured reference system backed by official
DoCA / Legal Metrology sources, with preserved source URL, retrieval date and
version information. Nothing here is invented law.
"""
import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.enums import (
    DocumentStatus,
    RuleCheckType,
    RuleSeverity,
    VerificationState,
)
from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPkMixin


class LegalSource(Base, UUIDPkMixin, TimestampMixin):
    """An official source document location (e.g. lawmin.nic.in / DoCA)."""

    __tablename__ = "legal_sources"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    source_organization: Mapped[Optional[str]] = mapped_column(String(255))
    source_url: Mapped[Optional[str]] = mapped_column(String(512))
    retrieval_date: Mapped[Optional[date]] = mapped_column(Date)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    documents: Mapped[list["LegalDocument"]] = relationship(back_populates="source")


class LegalDocument(Base, UUIDPkMixin, TimestampMixin):
    """An Act / Rules / Notification / Corrigendum."""

    __tablename__ = "legal_documents"

    source_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("legal_sources.id", ondelete="SET NULL")
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    reference: Mapped[Optional[str]] = mapped_column(String(120))
    document_type: Mapped[str] = mapped_column(String(40), nullable=False, default="Act")
    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus, name="document_status"), nullable=False, default=DocumentStatus.CURRENT
    )
    effective_date: Mapped[Optional[date]] = mapped_column(Date)
    verification_state: Mapped[VerificationState] = mapped_column(
        Enum(VerificationState, name="verification_state"),
        nullable=False,
        default=VerificationState.MANUAL_VERIFICATION_REQUIRED,
    )
    source_url: Mapped[Optional[str]] = mapped_column(String(512))

    source: Mapped[Optional["LegalSource"]] = relationship(back_populates="documents")
    rules: Mapped[list["LegalRule"]] = relationship(back_populates="document")


class LegalRule(Base, UUIDPkMixin, TimestampMixin):
    """A specific rule/schedule item under a legal document."""

    __tablename__ = "legal_rules"

    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("legal_documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rule_number: Mapped[Optional[str]] = mapped_column(String(80))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    category: Mapped[Optional[str]] = mapped_column(String(120))
    subcategory: Mapped[Optional[str]] = mapped_column(String(120))
    check_type: Mapped[RuleCheckType] = mapped_column(
        Enum(RuleCheckType, name="rule_check_type"),
        nullable=False,
        default=RuleCheckType.PRESENCE,
    )
    severity: Mapped[RuleSeverity] = mapped_column(
        Enum(RuleSeverity, name="rule_severity"), nullable=False, default=RuleSeverity.MINOR
    )
    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus, name="rule_status"), nullable=False, default=DocumentStatus.CURRENT
    )

    document: Mapped["LegalDocument"] = relationship(back_populates="rules")
    versions: Mapped[list["LegalRuleVersion"]] = relationship(
        back_populates="rule", cascade="all, delete-orphan"
    )


class LegalRuleVersion(Base, UUIDPkMixin, TimestampMixin):
    """A specific version of a rule — checks reference the exact version used."""

    __tablename__ = "legal_rule_versions"

    rule_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("legal_rules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version: Mapped[str] = mapped_column(String(40), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    content: Mapped[Optional[str]] = mapped_column(Text)
    effective_date: Mapped[Optional[date]] = mapped_column(Date)
    source_url: Mapped[Optional[str]] = mapped_column(String(512))
    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus, name="rule_version_status"),
        nullable=False,
        default=DocumentStatus.CURRENT,
    )
    change_note: Mapped[Optional[str]] = mapped_column(Text)

    rule: Mapped["LegalRule"] = relationship(back_populates="versions")


class LegalAmendment(Base, UUIDPkMixin, TimestampMixin):
    """Amendment / corrigendum / notification relationship."""

    __tablename__ = "legal_amendments"

    rule_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("legal_rules.id", ondelete="SET NULL")
    )
    document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("legal_documents.id", ondelete="SET NULL")
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    reference: Mapped[Optional[str]] = mapped_column(String(120))
    effective_date: Mapped[Optional[date]] = mapped_column(Date)
    amends: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus, name="amendment_status"),
        nullable=False,
        default=DocumentStatus.CURRENT,
    )