"""DEMO analysis engine — deterministic extraction and compliance evaluation.

This router simulates OCR / AI extraction in a fully deterministic way from the
extracted fields already captured. Output is explicitly marked `DEMO ANALYSIS`.
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models import Classification, ApplicabilityResult, ComplianceCheck, Finding, LegalRule, User
from app.models.enums import (
    CheckOutcome, ExtractionMode, FindingOfficerDecision, FindingStatus,
    InspectionStatus, OfficerDecision, Severity, UserRole,
)
from app.models.evidence import ExtractedField
from app.models.inspection import Inspection

router = APIRouter(prefix="/api", tags=["analysis"])

FIELD_LABELS = [
    "product_name", "brand", "net_quantity", "mrp", "maximum_retail_price",
    "manufacturer", "manufacturer_address", "country_of_origin",
    "consumer_care", "date_of_manufacture", "best_before", "batch_no",
    "common_name", "fssai_license", "unit_sale_price",
]


class AnalysisError(Exception):
    pass


class FindingDecision(BaseModel):
    decision: str = "Pending"
    notes: str = ""


def _get_inspection(db: Session, iid: str, user: User) -> Inspection:
    insp = db.query(Inspection).options(
        joinedload(Inspection.evidence), joinedload(Inspection.extracted_fields),
        joinedload(Inspection.ocr_results),
    ).filter(Inspection.id == iid).first()
    if not insp:
        raise HTTPException(404, "Inspection not found.")
    if user.role == UserRole.OFFICER and str(insp.owner_id) != str(user.id):
        raise HTTPException(403, "Access denied.")
    return insp


def _comma(value: Optional[str]) -> bool:
    return bool(value and str(value).strip())


def _or(value: Optional[str], default: str = "Not found on label") -> str:
    return str(value).strip() if value and str(value).strip() else default
def _field_for(rule: LegalRule, extracted: dict) -> Optional[str]:
    """Map a rule to a deterministic extracted field key."""
    key = (rule.category or "").lower()
    title = (rule.title or "").lower()
    haystack = key + " " + title
    pairs = [
        ("net_quantity", ["net quantity"]),
        ("mrp", ["mrp", "maximum retail"]),
        ("manufacturer", ["manufacturer", "name and address"]),
        ("country_of_origin", ["country of origin", "origin"]),
        ("consumer_care", ["consumer care", "toll free", "email address"]),
        ("best_before", ["best before", "expiry", "use by"]),
        ("date_of_manufacture", ["date of manufacture", "manufacture"]),
        ("batch_no", ["batch", "lot"]),
        ("common_name", ["common name", "generic name"]),
        ("fssai_license", ["fssai", "licence"]),
        ("unit_sale_price", ["unit sale price", "unit price"]),
        ("product_name", ["name of the commodity", "product name"]),
        ("brand", ["brand"]),
    ]
    for field, keywords in pairs:
        if any(k in haystack for k in keywords):
            return field
    for k, v in extracted.items():
        if _comma(v):
            return k
    return "product_name"


def _missing_issue(rule_text: str, extracted: dict) -> Optional[str]:
    checks = [
        ("consumer", "consumer care", "consumer care"),
        ("net quantity", "net_quantity", "net quantity"),
        ("mrp", "mrp", "maximum retail price (MRP)"),
        ("manufacturer", "manufacturer", "manufacturer details"),
        ("country", "country_of_origin", "country of origin"),
        ("best before", "best_before", "best before / expiry details"),
        ("manufacture", "date_of_manufacture", "date of manufacture"),
        ("common name", "common_name", "generic/common name"),
        ("batch", "batch_no", "batch / lot number"),
    ]
    for keyword, key, human in checks:
        if keyword in rule_text and not _comma(extracted.get(key)):
            return f"{human.title()} is a mandatory declaration under this rule but was not found on the label."
    return None


def _parses_date(value: str) -> bool:
    from datetime import datetime as dt
    for fmt in ("%d/%m/%Y", "%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%b/%Y", "%B/%Y", "%m/%y"):
        try:
            dt.strptime(value, fmt)
            return True
        except ValueError:
            continue
    return value.lower() in {"see label", "printed on label"}


def _mrp_sane(value: str) -> bool:
    cleaned = value.replace("Rs.", "").replace("rs.", "").replace("INR", "").replace("₹", "").strip()
    try:
        return float(cleaned) > 0
    except ValueError:
        return False


def _eval_rule(rule: LegalRule, extracted: dict, field_lookup: dict) -> tuple:
    """Evaluate one rule deterministically. Returns (outcome, severity, message, field_id)."""
    title = rule.title
    rule_text = (title + " " + (rule.description or "")).lower()
    field_key = _field_for(rule, extracted)
    value = _or(extracted.get(field_key), "")
    field_id = field_lookup.get(field_key)

    if not value or value == "Not found on label":
        return (
            CheckOutcome.NOT_APPLICABLE, Severity.LOW,
            f"{title} — data not available on the captured label; officer review recommended.",
            field_id,
        )

    missing = _missing_issue(rule_text, extracted)
    if missing:
        return (CheckOutcome.VIOLATION, Severity.HIGH, missing, field_id)

    check_type = (rule.check_type.value if rule.check_type else "PRESENCE").upper()
    if check_type == "FORMAT" or "best before" in rule_text or "expiry" in rule_text:
        if not _parses_date(value):
            return (
                CheckOutcome.VIOLATION, Severity.HIGH,
                f"{title} — '{value}' is not in a recognised readable date format (e.g. MM/YYYY or DD/MM/YYYY).",
                field_id,
            )
    if check_type == "CONSISTENCY" or "declare" in rule_text or "match" in rule_text:
        mrp = _or(extracted.get("mrp"), "")
        if mrp and not _mrp_sane(mrp):
            return (
                CheckOutcome.REVIEW, Severity.MEDIUM,
                f"{title} — maximum retail price '{mrp}' could not be verified as a valid price. Review manually.",
                field_id,
            )
    return (
        CheckOutcome.PASS, Severity.LOW,
        f"{title} — '{value}' declared and found on the label.",
        field_id,
    )


def _recommendation(rule: LegalRule) -> str:
    cats = (rule.category or "").lower()
    if "consumer" in cats:
        return "Provide a valid consumer care / contact for grievances."
    if "net quantity" in cats:
        return "Disclose the net quantity on the principal display panel."
    if "mrp" in cats:
        return "Print the maximum retail price including all taxes."
    if "manufacturer" in cats:
        return "Disclose the manufacturer's name and registered address."
    if "country" in cats:
        return "Declare the country of origin on the label."
    return "Review the label against the applicable legal requirement and document corrective action."
def _run_compliance(db: Session, inspection: Inspection, user: User) -> dict:
    """Run compliance checks for an inspection with existing extracted fields."""
    extracted: dict = {}
    field_lookup: dict = {}
    for f in inspection.extracted_fields:
        key = (f.label or "").lower().replace(" ", "_")
        extracted[key] = f.value or ""
        field_lookup[key] = str(f.id)

    fallback = {
        "product_name": inspection.product_name, "brand": inspection.product_brand,
        "net_quantity": inspection.net_quantity, "mrp": inspection.mrp,
        "manufacturer": inspection.manufacturer,
        "country_of_origin": inspection.country_of_origin,
        "consumer_care": inspection.consumer_care, "common_name": inspection.common_name,
        "date_of_manufacture": inspection.date_of_manufacture,
        "best_before": inspection.best_before,
    }
    for k, v in fallback.items():
        if not extracted.get(k) and v:
            extracted[k] = v

    rules = db.query(LegalRule).filter(LegalRule.status == "CURRENT").options(
        joinedload(LegalRule.versions)
    ).order_by(LegalRule.rule_number.asc()).all()
    if not rules:
        raise AnalysisError("Legal rule database is empty. Run the legal seed script first.")

    results = []
    summary = {"pass": 0, "review": 0, "violation": 0, "not_applicable": 0}

    for rule in rules:
        outcome, severity, message, field_id = _eval_rule(rule, extracted, field_lookup)
        rv = rule.versions[0] if rule.versions else None
        if rv is None:
            continue
        check = ComplianceCheck(
            inspection_id=inspection.id, rule_id=rule.id, rule_version_id=rv.id,
            extracted_field_id=field_id, outcome=outcome, severity=severity,
            message=message, checked_at=datetime.now(timezone.utc),
        )
        db.add(check)
        summary[outcome.value.lower()] += 1
        results.append({
            "rule_id": str(rule.id), "rule_version": rv.version,
            "title": rule.title, "category": rule.category,
            "outcome": outcome.value, "severity": severity.value, "message": message,
        })
        if outcome.value in ("VIOLATION", "REVIEW"):
            finding = Finding(
                inspection_id=inspection.id, rule_id=rule.id, rule_version_id=rv.id,
                extracted_field_id=field_id, title=rule.title, description=message,
                finding_type="VIOLATION" if outcome == CheckOutcome.VIOLATION else "REVIEW",
                severity=severity, status=FindingStatus.UNDER_REVIEW,
                officer_decision=FindingOfficerDecision.PENDING,
                recommendation=_recommendation(rule),
            )
            db.add(finding)
    db.flush()
    return {"results": results, "summary": summary}


def _classify(name: str) -> str:
    if any(k in name for k in ("oil", "ghee", "butter")):
        return "Edible Oil & Fats"
    if any(k in name for k in ("biscuit", "cookie", "chocolate", "candy", "snack", "chips", "namkeen")):
        return "Snacks & Confectionery"
    if any(k in name for k in ("milk", "curd", "cheese", "yogurt", "paneer")):
        return "Dairy Products"
    if any(k in name for k in ("soap", "detergent", "shampoo", "toothpaste", "cleaner")):
        return "Household & Personal Care"
    if any(k in name for k in ("beverage", "juice", "cola", "drink", "water", "tea", "coffee")):
        return "Food & Beverages"
    if any(k in name for k in ("medicine", "capsule", "tablet", "ointment", "syrup")):
        return "Pharmaceuticals"
    return "Food & Beverages" if "food" in name or "masala" in name else "Packaged Commodity"


def _subclassify(name: str) -> str:
    words = name.split()
    return words[0] if words else "commodity"


def _persist_classification(db: Session, inspection: Inspection) -> Classification:
    raw = " ".join(filter(None, [inspection.product_name, inspection.category])) or "Packaged Commodity"
    name = raw.lower()
    category = _classify(name)
    is_food = category in {
        "Edible Oil & Fats", "Snacks & Confectionery", "Dairy Products", "Food & Beverages",
    }
    result = Classification(
        inspection_id=inspection.id, category=category, subcategory=_subclassify(name),
        product_type=category, confidence=0.9 if is_food else 0.84,
        signals=["product name match", "packaged commodity heuristic", "trainable classifier (demo)"],
        candidates=[{"label": category, "confidence": 0.9 if is_food else 0.84}],
    )
    db.add(result)
    origin = (inspection.country_of_origin or "").strip().lower()
    was_imported = origin not in {"", "india", "made in india"}
    applicability = ApplicabilityResult(
        inspection_id=inspection.id, product_type=category, is_food=is_food,
        is_retail=True, is_imported=was_imported or bool(inspection.country_of_origin),
        is_special_category=False, quantity_condition=inspection.net_quantity,
        machine_checkable_count=12, officer_review_count=4,
    )
    db.add(applicability)
    db.flush()
    return result
def _emit(db: Session, insp: Inspection, label: str, value: str, surface: str, ev) -> None:
    if not value or not str(value).strip():
        return
    db.add(ExtractedField(
        inspection_id=insp.id, evidence_id=ev.id if ev else None,
        label=label, value=value, source=f"{surface} surface",
        ocr_confidence=0.94, extraction_confidence=0.9,
        extraction_mode=ExtractionMode.DEMO, status="accepted",
    ))


def _populate_extracted_fields(db: Session, insp: Inspection) -> None:
    front = {"product_name": insp.product_name or "Captured product",
             "brand": insp.product_brand or "", "net_quantity": insp.net_quantity or "",
             "mrp": insp.mrp or "", "maximum_retail_price": insp.mrp or "",
             "unit_sale_price": insp.unit_sale_price or ""}
    back = {"manufacturer": insp.manufacturer or "",
            "country_of_origin": insp.country_of_origin or "",
            "consumer_care": insp.consumer_care or "",
            "date_of_manufacture": insp.date_of_manufacture or "",
            "best_before": insp.best_before or "", "batch_no": "",
            "common_name": insp.common_name or "", "fssai_license": ""}
    evidence_by_surface = {e.surface.value: e for e in insp.evidence}
    front_ev = evidence_by_surface.get("Front")
    back_ev = evidence_by_surface.get("Back")
    for label, value in front.items():
        _emit(db, insp, label, value, "Front", front_ev)
    for label, value in back.items():
        _emit(db, insp, label, value, "Back", back_ev)
    for ocr in insp.ocr_results or []:
        if ocr.field and ocr.text and ocr.text.strip():
            _emit(db, insp, ocr.field.replace("_", " "), ocr.text, "OCR", None)
    db.flush()
    from app.models.evidence import ExtractedField as _EF
    if db.query(_EF).filter(_EF.inspection_id == insp.id).count() == 0:
        raise AnalysisError("No label data could be extracted. Capture the front and back of the package first.")


def _pct(n: int, vals) -> float:
    total = sum(vals)
    return (n / total) * 100 if total else 0.0


@router.get("/inspections/{inspection_id}/analysis")
def get_analysis(inspection_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    insp = _get_inspection(db, inspection_id, user)
    checks = db.query(ComplianceCheck).options(
        joinedload(ComplianceCheck.rule), joinedload(ComplianceCheck.rule_version),
    ).filter(ComplianceCheck.inspection_id == insp.id).all()
    findings = db.query(Finding).options(
        joinedload(Finding.rule), joinedload(Finding.rule_version),
    ).filter(Finding.inspection_id == insp.id).all()
    return {
        "inspection_id": str(insp.id), "mode": insp.mode.value,
        "stage": insp.stage, "demo": True,
        "note": "DEMO ANALYSIS — simulated extraction and rule evaluation for demonstration.",
        "extracted": [{"label": f.label, "value": f.value, "mode": f.extraction_mode.value}
                      for f in insp.extracted_fields],
        "classification": {"category": insp.classification.category if insp.classification else None,
                           "confidence": insp.classification.confidence if insp.classification else None},
        "checks": [{"id": str(c.id), "rule_id": str(c.rule_id),
                    "rule_number": c.rule.rule_number if c.rule else None,
                    "title": c.rule.title if c.rule else (c.rule_version.title if c.rule_version else c.title),
                    "version": c.rule_version.version if c.rule_version else "1.0",
                    "outcome": c.outcome.value, "severity": c.severity.value, "message": c.message}
                   for c in checks],
        "findings": [{"id": str(f.id), "rule_id": str(f.rule_id), "title": f.title,
                      "severity": f.severity.value, "type": f.finding_type,
                      "status": f.status.value, "description": f.description} for f in findings],
    }
@router.post("/inspections/{inspection_id}/analyse")
def run_analysis(
    inspection_id: str, request: Request,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    """Run the deterministic demo analysis pipeline for an inspection."""
    insp = _get_inspection(db, inspection_id, user)
    if not insp.extracted_fields:
        _populate_extracted_fields(db, insp)
    for old in (insp.classification, insp.applicability):
        if old is not None:
            db.delete(old)
    db.flush()
    classification = _persist_classification(db, insp)
    insp.category = classification.category
    insp.subcategory = classification.subcategory

    for c in db.query(ComplianceCheck).filter(ComplianceCheck.inspection_id == insp.id).all():
        db.delete(c)
    for f in db.query(Finding).filter(Finding.inspection_id == insp.id).all():
        db.delete(f)
    db.flush()

    compliance = _run_compliance(db, insp, user)
    after_pct = _pct(compliance["summary"]["pass"],
                     list(compliance["summary"].values()))
    insp.stage = "COMPLIANCE_EVALUATED"
    insp.status = (InspectionStatus.MANUAL_REVIEW
                   if compliance["summary"]["review"] or compliance["summary"]["violation"]
                   else InspectionStatus.UNDER_REVIEW)
    insp.analytics_score = round(after_pct, 1)
    insp.officer_decision = OfficerDecision.PENDING

    from app.services.audit import record_audit
    record_audit(db, "ANALYSIS_RUN", actor_id=user.id, actor_email=user.email,
                 entity_type="inspection", entity_id=str(insp.id),
                 metadata={"summary": compliance["summary"]},
                 ip_address=request.client.host if request.client else None)
    # Inform the officer that analysis is available for review.
    from app.models.activity import Notification
    from app.models.enums import NotificationType
    db.add(Notification(
        user_id=user.id,
        title=f"Analysis complete — {insp.inspection_number}",
        body=(
            f"Compliance evaluation finished: "
            f"{compliance['summary']['pass']} pass, {compliance['summary']['review']} review, "
            f"{compliance['summary']['violation']} violation(s). Awaiting officer review."
        ),
        notification_type=NotificationType.INSPECTION,
        related_inspection_id=insp.id,
    ))
    db.commit()
    db.refresh(insp)
    return {
        "inspection_id": str(insp.id),
        "inspection_number": insp.inspection_number,
        "status": insp.status.value, "stage": insp.stage,
        "analytics_score": insp.analytics_score, "demo": True,
        "note": "DEMO ANALYSIS — simulated OCR extraction and rule evaluation.",
        "classification": {"category": classification.category,
                           "subcategory": classification.subcategory,
                           "confidence": classification.confidence},
        "summary": compliance["summary"],
        "compliance_rate": round(_pct(compliance["summary"]["pass"],
                                      list(compliance["summary"].values())), 1),
        "checks": compliance["results"],
    }


@router.post("/inspections/{inspection_id}/findings/{finding_id}/decision")
def set_finding_decision(
    inspection_id: str, finding_id: str, payload: FindingDecision,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    """Officer decision on an individual finding."""
    insp = _get_inspection(db, inspection_id, user)
    finding = db.query(Finding).filter(
        Finding.id == finding_id, Finding.inspection_id == insp.id,
    ).first()
    if not finding:
        raise HTTPException(404, "Finding not found.")
    decision = payload.decision
    notes = payload.notes
    mapping = {
        "Confirmed": FindingOfficerDecision.CONFIRMED,
        "Needs Review": FindingOfficerDecision.NEEDS_REVIEW,
        "Not Established": FindingOfficerDecision.NOT_ESTABLISHED,
        "Pending": FindingOfficerDecision.PENDING,
    }
    finding.officer_decision = mapping.get(decision, FindingOfficerDecision.NEEDS_REVIEW)
    finding.officer_notes = notes
    if decision == "Confirmed":
        finding.status = FindingStatus.POTENTIAL_VIOLATION
    elif decision == "Not Established":
        finding.status = FindingStatus.RESOLVED
    else:
        finding.status = FindingStatus.UNDER_REVIEW
    from app.services.audit import record_audit
    record_audit(db, "FINDING_DECISION_SET", actor_id=user.id, actor_email=user.email,
                 entity_type="finding", entity_id=str(finding.id),
                 metadata={"decision": decision})
    db.commit()
    db.refresh(finding)
    return {"id": str(finding.id), "officer_decision": finding.officer_decision.value,
            "status": finding.status.value, "officer_notes": finding.officer_notes}