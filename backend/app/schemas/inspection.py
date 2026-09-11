"""Pydantic schemas for the Inspection domain."""
import uuid
from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import (
    InspectionMode,
    InspectionStatus,
    InspectionType,
    OfficerDecision,
)


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class InspectionCreate(BaseModel):
    """Create a new inspection."""
    inspection_type: InspectionType = InspectionType.ROUTINE
    mode: InspectionMode = InspectionMode.PHYSICAL_PACKAGE
    location: Optional[str] = Field(default=None, max_length=255)
    status: InspectionStatus = InspectionStatus.DRAFT
    stage: str = Field(default="IDLE", max_length=40)
    product_name: Optional[str] = None
    product_brand: Optional[str] = None
    manufacturer: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    barcode: Optional[str] = None
    net_quantity: Optional[str] = None
    mrp: Optional[str] = None
    date_of_manufacture: Optional[str] = None
    best_before: Optional[str] = None
    country_of_origin: Optional[str] = None
    common_name: Optional[str] = None
    consumer_care: Optional[str] = None
    unit_sale_price: Optional[str] = None
    is_demo: bool = False


class InspectionUpdate(BaseModel):
    """Partial update for an inspection."""
    inspection_type: Optional[InspectionType] = None
    mode: Optional[InspectionMode] = None
    location: Optional[str] = None
    status: Optional[InspectionStatus] = None
    stage: Optional[str] = None
    product_name: Optional[str] = None
    product_brand: Optional[str] = None
    manufacturer: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    barcode: Optional[str] = None
    net_quantity: Optional[str] = None
    mrp: Optional[str] = None
    date_of_manufacture: Optional[str] = None
    best_before: Optional[str] = None
    country_of_origin: Optional[str] = None
    common_name: Optional[str] = None
    consumer_care: Optional[str] = None
    unit_sale_price: Optional[str] = None
    analytics_score: Optional[float] = None
    report_generated: Optional[bool] = None


class OfficerDecisionRequest(BaseModel):
    decision: OfficerDecision
    notes: Optional[str] = None


class OwnerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    department: Optional[str] = None
    jurisdiction: Optional[str] = None
    employee_id: Optional[str] = None


class EvidenceSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    surface: str
    original_filename: Optional[str] = None
    stored_filename: Optional[str] = None
    mime_type: Optional[str] = None
    file_size: Optional[int] = None
    quality_status: str = "Poor"
    quality_score: Optional[int] = None
    is_placeholder: bool = False
    captured_at: Optional[datetime] = None
    storage_path: Optional[str] = None


class ExtractedFieldOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    evidence_id: Optional[uuid.UUID] = None
    label: str
    value: Optional[str] = None
    source: Optional[str] = None
    ocr_confidence: Optional[float] = None
    extraction_confidence: Optional[float] = None
    extraction_mode: str = "DEMO"
    status: str = "accepted"


class ComplianceCheckOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    rule_id: uuid.UUID
    rule_version_id: uuid.UUID
    outcome: str
    severity: str = "MEDIUM"
    message: Optional[str] = None
    checked_at: Optional[datetime] = None


class FindingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    compliance_check_id: Optional[uuid.UUID] = None
    rule_id: uuid.UUID
    rule_version_id: uuid.UUID
    extracted_field_id: Optional[uuid.UUID] = None
    evidence_id: Optional[uuid.UUID] = None
    title: str
    description: Optional[str] = None
    finding_type: str = "INFO"
    severity: str = "MEDIUM"
    status: str = "Under Review"
    recommendation: Optional[str] = None
    officer_decision: str = "Pending"
    officer_notes: Optional[str] = None


class ClassificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    category: Optional[str] = None
    subcategory: Optional[str] = None
    product_type: Optional[str] = None
    confidence: Optional[float] = None


class ApplicabilityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    product_type: Optional[str] = None
    is_food: bool = False
    is_retail: bool = False
    is_imported: bool = False
    is_special_category: bool = False
    machine_checkable_count: int = 0
    officer_review_count: int = 0


# Serializer helpers
def _enum_str(val: Any) -> str:
    return val.value if hasattr(val, "value") else str(val)


def serialize_user(user: Any) -> dict | None:
    if user is None:
        return None
    return {
        "id": str(user.id), "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "department": user.department, "jurisdiction": user.jurisdiction,
        "employee_id": user.employee_id,
    }


def serialize_inspection_full(insp: Any) -> dict:
    """Serialize an Inspection ORM object to a full response dict."""
    ev_list = []
    if hasattr(insp, "evidence") and insp.evidence:
        for e in insp.evidence:
            ev_list.append({
                "id": str(e.id), "surface": _enum_str(e.surface),
                "original_filename": e.original_filename,
                "stored_filename": e.stored_filename,
                "mime_type": e.mime_type, "file_size": e.file_size,
                "quality_status": _enum_str(e.quality_status),
                "quality_score": e.quality_score,
                "is_placeholder": e.is_placeholder,
                "captured_at": e.captured_at.isoformat() if e.captured_at else None,
                "storage_path": e.storage_path,
            })
    ef_list = []
    if hasattr(insp, "extracted_fields") and insp.extracted_fields:
        for f in insp.extracted_fields:
            ef_list.append({
                "id": str(f.id),
                "evidence_id": str(f.evidence_id) if f.evidence_id else None,
                "label": f.label, "value": f.value, "source": f.source,
                "ocr_confidence": f.ocr_confidence,
                "extraction_confidence": f.extraction_confidence,
                "extraction_mode": _enum_str(f.extraction_mode), "status": f.status,
            })
    cc_list = []
    if hasattr(insp, "compliance_checks") and insp.compliance_checks:
        for c in insp.compliance_checks:
            cc_list.append({
                "id": str(c.id), "rule_id": str(c.rule_id),
                "rule_version_id": str(c.rule_version_id),
                "outcome": _enum_str(c.outcome), "severity": _enum_str(c.severity),
                "message": c.message,
                "checked_at": c.checked_at.isoformat() if c.checked_at else None,
            })
    fi_list = []
    if hasattr(insp, "findings") and insp.findings:
        for fi in insp.findings:
            fi_list.append({
                "id": str(fi.id),
                "compliance_check_id": str(fi.compliance_check_id) if fi.compliance_check_id else None,
                "rule_id": str(fi.rule_id), "rule_version_id": str(fi.rule_version_id),
                "extracted_field_id": str(fi.extracted_field_id) if fi.extracted_field_id else None,
                "evidence_id": str(fi.evidence_id) if fi.evidence_id else None,
                "title": fi.title, "description": fi.description,
                "finding_type": fi.finding_type, "severity": _enum_str(fi.severity),
                "status": _enum_str(fi.status), "recommendation": fi.recommendation,
                "officer_decision": _enum_str(fi.officer_decision),
                "officer_notes": fi.officer_notes,
            })
    cls_out = None
    if hasattr(insp, "classification") and insp.classification:
        c = insp.classification
        cls_out = {"id": str(c.id), "category": c.category,
                   "subcategory": c.subcategory, "product_type": c.product_type,
                   "confidence": c.confidence}
    app_out = None
    if hasattr(insp, "applicability") and insp.applicability:
        a = insp.applicability
        app_out = {"id": str(a.id), "product_type": a.product_type,
                   "is_food": a.is_food, "is_retail": a.is_retail,
                   "is_imported": a.is_imported, "is_special_category": a.is_special_category,
                   "machine_checkable_count": a.machine_checkable_count,
                   "officer_review_count": a.officer_review_count}
    return {
        "id": str(insp.id), "inspection_number": insp.inspection_number,
        "owner_id": str(insp.owner_id),
        "inspection_type": _enum_str(insp.inspection_type),
        "mode": _enum_str(insp.mode), "location": insp.location,
        "status": _enum_str(insp.status), "stage": insp.stage,
        "product_name": insp.product_name, "product_brand": insp.product_brand,
        "manufacturer": insp.manufacturer, "category": insp.category,
        "subcategory": insp.subcategory, "barcode": insp.barcode,
        "net_quantity": insp.net_quantity, "mrp": insp.mrp,
        "date_of_manufacture": insp.date_of_manufacture,
        "best_before": insp.best_before,
        "country_of_origin": insp.country_of_origin,
        "common_name": insp.common_name, "consumer_care": insp.consumer_care,
        "unit_sale_price": insp.unit_sale_price,
        "officer_decision": _enum_str(insp.officer_decision),
        "final_notes": insp.final_notes,
        "decision_date": insp.decision_date.isoformat() if insp.decision_date else None,
        "analytics_score": insp.analytics_score,
        "report_generated": insp.report_generated, "is_demo": insp.is_demo,
        "created_at": insp.created_at.isoformat(),
        "updated_at": insp.updated_at.isoformat(),
        "owner": serialize_user(insp.owner),
        "evidence": ev_list, "extracted_fields": ef_list,
        "compliance_checks": cc_list, "findings": fi_list,
        "classification": cls_out, "applicability": app_out,
    }


def serialize_inspection_list(insp: Any) -> dict:
    """Serialize an Inspection ORM object for list views."""
    front_image = None
    evidence_count = 0
    if hasattr(insp, "evidence") and insp.evidence:
        evidence_count = len(insp.evidence)
        for e in insp.evidence:
            if _enum_str(e.surface) == "Front" and e.storage_path:
                front_image = e.storage_path
                break
    return {
        "id": str(insp.id), "inspection_number": insp.inspection_number,
        "owner_id": str(insp.owner_id),
        "inspection_type": _enum_str(insp.inspection_type),
        "mode": _enum_str(insp.mode), "location": insp.location,
        "status": _enum_str(insp.status), "stage": insp.stage,
        "product_name": insp.product_name, "product_brand": insp.product_brand,
        "manufacturer": insp.manufacturer, "category": insp.category,
        "officer_decision": _enum_str(insp.officer_decision),
        "analytics_score": insp.analytics_score, "is_demo": insp.is_demo,
        "created_at": insp.created_at.isoformat(),
        "updated_at": insp.updated_at.isoformat(),
        "evidence_count": evidence_count, "front_image_path": front_image,
        "owner": serialize_user(insp.owner),
    }
