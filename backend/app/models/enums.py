"""Shared enum values used across SATYATAG ORM models."""
import enum


class UserRole(str, enum.Enum):
    OFFICER = "officer"
    SUPERVISOR = "supervisor"
    ADMIN = "admin"


class AccountStatus(str, enum.Enum):
    ACTIVE = "active"
    DISABLED = "disabled"
    PENDING_VERIFICATION = "pending_verification"


class Surface(str, enum.Enum):
    FRONT = "Front"
    BACK = "Back"
    SIDE_1 = "Side 1"
    SIDE_2 = "Side 2"
    OTHER = "Other"


class QualityStatus(str, enum.Enum):
    GOOD = "Good"
    ACCEPTABLE = "Acceptable"
    POOR = "Poor"


class InspectionType(str, enum.Enum):
    ROUTINE = "Routine"
    COMPLAINT = "Complaint"
    FOLLOW_UP = "Follow-up"


class InspectionMode(str, enum.Enum):
    PHYSICAL_PACKAGE = "Physical Package"
    PRODUCT_LISTING = "Product Listing"


class InspectionStatus(str, enum.Enum):
    DRAFT = "Draft"
    IN_PROGRESS = "In Progress"
    UNDER_REVIEW = "Under Review"
    MANUAL_REVIEW = "Manual Review"
    COMPLIANT = "Compliant"
    NON_COMPLIANT = "Non-Compliant"
    COMPLETED = "Completed"


class OfficerDecision(str, enum.Enum):
    PENDING = "Pending"
    COMPLIANT = "COMPLIANT"
    MANUAL_REVIEW = "MANUAL REVIEW"
    NON_COMPLIANT = "NON-COMPLIANT"


class CheckOutcome(str, enum.Enum):
    PASS = "PASS"
    REVIEW = "REVIEW"
    VIOLATION = "VIOLATION"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class Severity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class FindingStatus(str, enum.Enum):
    UNDER_REVIEW = "Under Review"
    POTENTIAL_VIOLATION = "Potential Violation"
    INFORMATIONAL = "Informational"
    RESOLVED = "Resolved"


class FindingOfficerDecision(str, enum.Enum):
    PENDING = "Pending"
    CONFIRMED = "Confirmed"
    NEEDS_REVIEW = "Needs Review"
    NOT_ESTABLISHED = "Not Established"


class DocumentStatus(str, enum.Enum):
    CURRENT = "CURRENT"
    SUPERSEDED = "SUPERSEDED"
    FUTURE = "FUTURE"
    ARCHIVED = "ARCHIVED"


class VerificationState(str, enum.Enum):
    VERIFIED = "verified"
    MANUAL_VERIFICATION_REQUIRED = "manual_verification_required"


class RuleCheckType(str, enum.Enum):
    PRESENCE = "PRESENCE"
    CONSISTENCY = "CONSISTENCY"
    FORMAT = "FORMAT"
    VISIBILITY = "VISIBILITY"
    MEASUREMENT = "MEASUREMENT"
    SUFFICIENCY = "SUFFICIENCY"


class RuleSeverity(str, enum.Enum):
    MAJOR = "MAJOR"
    MINOR = "MINOR"
    INFO = "INFO"


class ExtractionMode(str, enum.Enum):
    DEMO = "DEMO"
    OFFICIAL = "OFFICIAL"
    MANUAL = "MANUAL"


class NotificationType(str, enum.Enum):
    SYSTEM = "SYSTEM"
    INSPECTION = "INSPECTION"
    DECISION = "DECISION"
    REPORT = "REPORT"


class ListingCheckStatus(str, enum.Enum):
    CREATED = "CREATED"
    ANALYSED = "ANALYSED"
    REVIEW = "REVIEW"