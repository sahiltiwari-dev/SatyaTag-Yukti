"""SQLAlchemy ORM models.

Importing this package registers every model on Base.metadata so that
Alembic autogenerate and `Base.metadata.create_all` (tests only) work.
"""
from app.database import Base

# Models must be imported so their tables are registered on Base.metadata.
from app.models.user import (
    EmailVerification,
    PasswordResetToken,
    Session,
    User,
    UserProfile,
)
from app.models.inspection import Inspection
from app.models.evidence import EvidenceAsset, ExtractedField, OCRResult
from app.models.classification import (
    ApplicabilityResult,
    Classification,
    ListingAnalysis,
    ListingCheck,
)
from app.models.legal import (
    LegalAmendment,
    LegalDocument,
    LegalRule,
    LegalRuleVersion,
    LegalSource,
)
from app.models.compliance import ComplianceCheck, Finding
from app.models.decisions import OfficerDecision, ReportMetadata
from app.models.activity import AuditEvent, Notification

__all__ = [
    "Base",
    "User",
    "UserProfile",
    "Session",
    "EmailVerification",
    "PasswordResetToken",
    "Inspection",
    "EvidenceAsset",
    "OCRResult",
    "ExtractedField",
    "Classification",
    "ApplicabilityResult",
    "ListingCheck",
    "ListingAnalysis",
    "LegalSource",
    "LegalDocument",
    "LegalRule",
    "LegalRuleVersion",
    "LegalAmendment",
    "ComplianceCheck",
    "Finding",
    "OfficerDecision",
    "ReportMetadata",
    "Notification",
    "AuditEvent",
]