"""Seed the SATYATAG demo dataset.

Idempotent deterministic demo data for the local PostgreSQL instance. Creates:

  * demo users (officer / supervisor / admin) with profiles
  * the Legal Metrology knowledge base (Act + Packaged Commodities Rules)
  * six fully-connected demo inspections covering PASS, REVIEW, VIOLATION and
    NOT_APPLICABLE scenarios, each with: product -> evidence metadata -> OCR ->
    extracted fields (DEMO_FIXTURE) -> classification -> applicability ->
    compliance checks (real engine) -> findings -> officer decision ->
    notifications -> audit events
  * PDF reports (reportlab) for selected inspections
  * welcome system notification + login audit event

Every seeded record is explicitly marked DEMO DATA (`is_demo=True`,
`source=DEMO_FIXTURE`, metadata tag `demo_seed`) so it can never be confused
with live data. Running the script again only ever replaces demo records and
never touches live user data.

Run from the backend directory:
    .\\.venv\\Scripts\\python.exe -m scripts.seed_demo
"""
from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy.orm import Session

from app.auth.security import hash_password
from app.database import SessionLocal
from app.models import (
    ApplicabilityResult, AuditEvent, Classification, EvidenceAsset,
    ExtractedField, Inspection, Notification, OCRResult, OfficerDecision,
    ReportMetadata, User, UserProfile,
)
from app.models.activity import Notification as NotificationRow
from app.models.enums import (
    AccountStatus, CheckOutcome, ExtractionMode, InspectionMode,
    InspectionStatus, InspectionType, NotificationType,
    OfficerDecision as OfficerDecisionState, QualityStatus, Surface, UserRole,
)

DEMO_PASSWORD = "demo123"
DEMO_MARKER = {"demo_seed": True}

DEMO_USERS = [
    {
        "email": "officer@consumer.gov.in",
        "full_name": "A. Sharma",
        "role": UserRole.OFFICER,
        "department": "Department of Consumer Affairs",
        "jurisdiction": "Delhi (Central)",
        "employee_id": "LM-DEL-001",
        "profile": {
            "designation": "Legal Metrology Officer",
            "phone": "+91-11-2338-0001",
            "address": "Legal Metrology Division, Krishi Bhawan, New Delhi",
        },
    },
    {
        "email": "supervisor@consumer.gov.in",
        "full_name": "R. Mehta",
        "role": UserRole.SUPERVISOR,
        "department": "Department of Consumer Affairs",
        "jurisdiction": "Delhi (Central)",
        "employee_id": "LM-DEL-002",
        "profile": {
            "designation": "Senior Supervisor",
            "phone": "+91-11-2338-0002",
            "address": "Legal Metrology Division, Krishi Bhawan, New Delhi",
        },
    },
    {
        "email": "admin@consumer.gov.in",
        "full_name": "S. Iyer",
        "role": UserRole.ADMIN,
        "department": "Department of Consumer Affairs",
        "jurisdiction": "All India",
        "employee_id": "LM-ADM-001",
        "profile": {
            "designation": "System Administrator",
            "phone": "+91-11-2338-0003",
            "address": "Department of Consumer Affairs, New Delhi",
        },
    },
]

# ---------------------------------------------------------------------------
# Demo inspections.
#
# scenario: deterministic compliance scenario ("PASS" | "REVIEW" | "VIOLATION"
#           | "NOT_APPLICABLE" | "PENDING").
# fields:   extracted label -> value (source is always DEMO_FIXTURE). Use
#           "NOT VERIFIED FROM IMAGE" to drive REVIEW outcomes and invalid
#           declarations to drive VIOLATION outcomes.
# decision: officer decision or None to leave Pending.
# ---------------------------------------------------------------------------

DEMO_INSPECTIONS = [
    {
        "number": "SAT-DEMO-2025-0001",
        "scenario": "PASS",
        "days_ago": 1,
        "type": InspectionType.ROUTINE,
        "mode": InspectionMode.PHYSICAL_PACKAGE,
        "location": "Big Bazaar, Andheri West, Mumbai",
        "product": {
            "product_name": "Lay's India's Magic Masala Potato Chips",
            "product_brand": "Lay's",
            "manufacturer": "PepsiCo India Holdings Pvt. Ltd.",
            "category": "Snacks & Confectionery",
            "subcategory": "Potato Chips",
            "barcode": "8901491100108",
            "net_quantity": "52 g",
            "mrp": "Rs. 20.00",
            "date_of_manufacture": "08/2026",
            "best_before": "02/2027",
            "country_of_origin": "India",
            "common_name": "Potato Chips",
            "consumer_care": "1800-11-4000",
            "unit_sale_price": "Rs. 38.46/100g",
        },
        "evidence": [
            {"surface": Surface.FRONT, "quality": QualityStatus.GOOD, "quality_score": 96,
             "label": "Front — principal display panel", "captured_at_offset_days": 1},
            {"surface": Surface.BACK, "quality": QualityStatus.GOOD, "quality_score": 94,
             "label": "Back — ingredient and manufacturer block", "captured_at_offset_days": 1},
        ],
        "ocr": [
            ("product_name", "Lay's India's Magic Masala Potato Chips", 0.98),
            ("brand", "Lay's", 0.99),
            ("net_quantity", "Net Weight 52 g", 0.97),
            ("mrp", "MRP (incl. of all taxes) Rs. 20.00", 0.96),
            ("manufacturer", "PepsiCo India Holdings Pvt. Ltd.", 0.95),
            ("date_of_manufacture", "Mfg. date: Aug 2026", 0.93),
            ("best_before", "Best before: Feb 2027", 0.93),
            ("country_of_origin", "Made in India", 0.99),
            ("consumer_care", "Consumer care: 1800-11-4000", 0.94),
            ("batch_no", "Batch: L2608A17", 0.92),
        ],
        "fields": [
            ("Product Name", "Lay's India's Magic Masala Potato Chips", "Front"),
            ("Brand", "Lay's", "Front"),
            ("Net Quantity", "52 g", "Front"),
            ("MRP", "Rs. 20.00", "Front"),
            ("Maximum Retail Price", "Rs. 20.00", "Front"),
            ("Unit Sale Price", "Rs. 38.46/100g", "Front"),
            ("Consumer Care", "1800-11-4000", "Front"),
            ("Manufacturer", "PepsiCo India Holdings Pvt. Ltd.", "Back"),
            ("Country of Origin", "India", "Back"),
            ("Date of Manufacture", "08/2026", "Back"),
            ("Best Before", "02/2027", "Back"),
            ("Batch No", "L2608A17", "Back"),
            ("Common Name", "Potato Chips", "Back"),
            ("FSSAI License", "10012042000037", "Back"),
            ("Nutritional Info", "Energy 450 kcal, Protein 4.6 g, Carbohydrate 54.3 g per 100g", "Back"),
        ],
        "classification": {"category": "Snacks & Confectionery", "subcategory": "Potato Chips",
                           "product_type": "Snacks & Confectionery", "confidence": 0.96},
        "decision": {"decision": "COMPLIANT",
                     "notes": "All mandatory declarations verified against the physical package."},
        "report": True,
        "final_notes": "Package conforms to the mandatory declaration requirements of the Legal Metrology (Packaged Commodities) Rules, 2011.",
    },
    {
        "number": "SAT-DEMO-2025-0002",
        "scenario": "REVIEW",
        "days_ago": 2,
        "type": InspectionType.COMPLAINT,
        "mode": InspectionMode.PHYSICAL_PACKAGE,
        "location": "More Megastore, Koramangala, Bengaluru",
        "product": {
            "product_name": "Britannia Good Day Cashew Cookies",
            "product_brand": "Britannia",
            "manufacturer": "Britannia Industries Ltd.",
            "category": "Snacks & Confectionery",
            "subcategory": "Biscuits",
            "barcode": "8901063001025",
            "net_quantity": "300 g",
            "mrp": "Rs. 45.00",
            "date_of_manufacture": "06/2026",
            "best_before": "12/2026",
            "country_of_origin": "India",
            "common_name": "Sweet Biscuits",
            "consumer_care": "1800-22-5000",
            "unit_sale_price": "Rs. 15.00/100g",
        },
        "evidence": [
            {"surface": Surface.FRONT, "quality": QualityStatus.ACCEPTABLE, "quality_score": 78,
             "label": "Front — MRP partially obscured by retail price sticker", "captured_at_offset_days": 2},
            {"surface": Surface.BACK, "quality": QualityStatus.GOOD, "quality_score": 91,
             "label": "Back — declaration block", "captured_at_offset_days": 2},
        ],
        "ocr": [
            ("product_name", "Britannia Good Day Cashew Cookies", 0.97),
            ("mrp", "MRP partially covered by sticker — unreadable", 0.55),
            ("net_quantity", "Net Weight 300 g", 0.96),
            ("batch_no", "batch/lot unreadable", 0.48),
            ("best_before", "Best before: Dec 2026", 0.93),
        ],
        "fields": [
            ("Product Name", "Britannia Good Day Cashew Cookies", "Front"),
            ("Brand", "Britannia", "Front"),
            ("Net Quantity", "300 g", "Front"),
            ("MRP", "NOT VERIFIED FROM IMAGE", "Front"),
            ("Maximum Retail Price", "NOT VERIFIED FROM IMAGE", "Front"),
            ("Manufacturer", "Britannia Industries Ltd.", "Back"),
            ("Country of Origin", "India", "Back"),
            ("Date of Manufacture", "06/2026", "Back"),
            ("Best Before", "12/2026", "Back"),
            ("Batch No", "NOT VERIFIED FROM IMAGE", "Back"),
            ("Common Name", "Sweet Biscuits", "Back"),
            ("Consumer Care", "1800-22-5000", "Back"),
            ("FSSAI License", "10017001000228", "Back"),
            ("Nutritional Info", "Energy 495 kcal, Protein 6.8 g, Carbohydrate 64 g per 100g", "Back"),
        ],
        "classification": {"category": "Snacks & Confectionery", "subcategory": "Biscuits",
                           "product_type": "Snacks & Confectionery", "confidence": 0.95},
        "decision": {"decision": "MANUAL REVIEW",
                     "notes": "MRP and batch/lot could not be verified from the captured images due to a retail price sticker covering the MRP block."},
        "report": True,
        "final_notes": "Retail price sticker covering the MRP makes the mandatory maximum retail price declaration unverifiable from the evidence captured.",
    },
{
        "number": "SAT-DEMO-2025-0003",
        "scenario": "VIOLATION",
        "days_ago": 3,
        "type": InspectionType.ROUTINE,
        "mode": InspectionMode.PHYSICAL_PACKAGE,
        "location": "Reliance Fresh, T Nagar, Chennai",
        "product": {
            "product_name": "Thums Up 300ml PET Bottle",
            "product_brand": "Thums Up",
            "manufacturer": "Hindustan Coca-Cola Beverages Pvt. Ltd.",
            "category": "Food & Beverages",
            "subcategory": "Carbonated Soft Drink",
            "barcode": "8901058330319",
            "net_quantity": "300 ml",
            "mrp": "Rs. 30.00",
            "date_of_manufacture": "08/2026",
            "best_before": "31/2027",
            "country_of_origin": "India",
            "common_name": "Carbonated Soft Drink",
            "consumer_care": "1800-209-8888",
            "unit_sale_price": "Rs. 10.00/100ml",
        },
        "evidence": [
            {"surface": Surface.FRONT, "quality": QualityStatus.GOOD, "quality_score": 92,
             "label": "Front — principal display panel", "captured_at_offset_days": 3},
            {"surface": Surface.BACK, "quality": QualityStatus.ACCEPTABLE, "quality_score": 81,
             "label": "Back — declaration block", "captured_at_offset_days": 3},
        ],
        "ocr": [
            ("product_name", "Thums Up 300ml", 0.98),
            ("best_before", "Best before: 31/2027", 0.88),
            ("net_quantity", "Net Content 300 ml", 0.96),
            ("mrp", "MRP Rs. 30.00", 0.95),
        ],
        "fields": [
            ("Product Name", "Thums Up 300ml PET Bottle", "Front"),
            ("Brand", "Thums Up", "Front"),
            ("Net Quantity", "300 ml", "Front"),
            ("MRP", "Rs. 30.00", "Front"),
            ("Maximum Retail Price", "Rs. 30.00", "Front"),
            ("Manufacturer", "Hindustan Coca-Cola Beverages Pvt. Ltd.", "Back"),
            ("Country of Origin", "India", "Back"),
            ("Date of Manufacture", "08/2026", "Back"),
            ("Best Before", "31/2027", "Back"),
            ("Batch No", "B3421A01", "Back"),
            ("Common Name", "Carbonated Soft Drink", "Back"),
            ("Consumer Care", "1800-209-8888", "Back"),
            ("FSSAI License", "10017001000456", "Back"),
            ("Nutritional Info", "Energy 49 kcal per 300ml serving", "Back"),
        ],
        "classification": {"category": "Food & Beverages", "subcategory": "Carbonated Soft Drink",
                           "product_type": "Food & Beverages", "confidence": 0.97},
        "decision": {"decision": "NON-COMPLIANT",
                     "notes": "Best-before date printed as '31/2027' is not a valid calendar date. Month 13 cannot be parsed."},
        "report": True,
        "final_notes": "Best-before declaration '31/2027' is malformed and cannot be parsed as a month/year value.",
    },
{
        "number": "SAT-DEMO-2025-0004",
        "scenario": "PASS",
        "days_ago": 4,
        "type": InspectionType.ROUTINE,
        "mode": InspectionMode.PHYSICAL_PACKAGE,
        "location": "D-Mart, Sector 62, Noida",
        "product": {
            "product_name": "Kurkure Masala Munch",
            "product_brand": "Kurkure",
            "manufacturer": "PepsiCo India Holdings Pvt. Ltd.",
            "category": "Snacks & Confectionery",
            "subcategory": "Extruded Snack",
            "barcode": "8901491100269",
            "net_quantity": "90 g",
            "mrp": "Rs. 20.00",
            "date_of_manufacture": "07/2026",
            "best_before": "01/2027",
            "country_of_origin": "India",
            "common_name": "Extruded Snack",
            "consumer_care": "1800-11-4000",
            "unit_sale_price": "Rs. 22.22/100g",
        },
        "evidence": [
            {"surface": Surface.FRONT, "quality": QualityStatus.GOOD, "quality_score": 95,
             "label": "Front — principal display panel", "captured_at_offset_days": 4},
            {"surface": Surface.BACK, "quality": QualityStatus.GOOD, "quality_score": 93,
             "label": "Back — declaration block", "captured_at_offset_days": 4},
        ],
        "ocr": [
            ("product_name", "Kurkure Masala Munch", 0.98),
            ("net_quantity", "Net Weight 90 g", 0.97),
            ("mrp", "MRP Rs. 20.00", 0.97),
            ("best_before", "Best before: Jan 2027", 0.94),
        ],
        "fields": [
            ("Product Name", "Kurkure Masala Munch", "Front"),
            ("Brand", "Kurkure", "Front"),
            ("Net Quantity", "90 g", "Front"),
            ("MRP", "Rs. 20.00", "Front"),
            ("Maximum Retail Price", "Rs. 20.00", "Front"),
            ("Unit Sale Price", "Rs. 22.22/100g", "Front"),
            ("Manufacturer", "PepsiCo India Holdings Pvt. Ltd.", "Back"),
            ("Country of Origin", "India", "Back"),
            ("Date of Manufacture", "07/2026", "Back"),
            ("Best Before", "01/2027", "Back"),
            ("Batch No", "K2607B03", "Back"),
            ("Common Name", "Extruded Snack", "Back"),
            ("Consumer Care", "1800-11-4000", "Back"),
            ("FSSAI License", "10012042000037", "Back"),
            ("Nutritional Info", "Energy 480 kcal, Protein 6.2 g, Carbohydrate 58 g per 100g", "Back"),
        ],
        "classification": {"category": "Snacks & Confectionery", "subcategory": "Extruded Snack",
                           "product_type": "Snacks & Confectionery", "confidence": 0.96},
        "decision": {"decision": "COMPLIANT",
                     "notes": "All mandatory declarations verified. Package is compliant."},
        "report": False,
        "final_notes": "Declarations present and legible on the principal display panel.",
    },
    {
        "number": "SAT-DEMO-2025-0005",
        "scenario": "NOT_APPLICABLE",
        "days_ago": 5,
        "type": InspectionType.ROUTINE,
        "mode": InspectionMode.PHYSICAL_PACKAGE,
        "location": "Star Bazaar, Salt Lake, Kolkata",
        "product": {
            "product_name": "Surf Excel Easy Wash Detergent Powder",
            "product_brand": "Surf Excel",
            "manufacturer": "Hindustan Unilever Ltd.",
            "category": "Household & Personal Care",
            "subcategory": "Detergent",
            "barcode": "8901030700703",
            "net_quantity": "1 kg",
            "mrp": "Rs. 185.00",
            "date_of_manufacture": "05/2026",
            "best_before": "05/2028",
            "country_of_origin": "India",
            "common_name": "Laundry Detergent",
            "consumer_care": "1800-22-5000",
            "unit_sale_price": "Rs. 18.50/100g",
        },
        "evidence": [
            {"surface": Surface.FRONT, "quality": QualityStatus.GOOD, "quality_score": 94,
             "label": "Front — principal display panel", "captured_at_offset_days": 5},
            {"surface": Surface.BACK, "quality": QualityStatus.ACCEPTABLE, "quality_score": 87,
             "label": "Back — usage and safety block", "captured_at_offset_days": 5},
        ],
        "ocr": [
            ("product_name", "Surf Excel Easy Wash Detergent Powder", 0.97),
            ("net_quantity", "Net Weight 1 kg", 0.97),
            ("mrp", "MRP Rs. 185.00", 0.96),
        ],
        "fields": [
            ("Product Name", "Surf Excel Easy Wash Detergent Powder", "Front"),
            ("Brand", "Surf Excel", "Front"),
            ("Net Quantity", "1 kg", "Front"),
            ("MRP", "Rs. 185.00", "Front"),
            ("Maximum Retail Price", "Rs. 185.00", "Front"),
            ("Unit Sale Price", "Rs. 18.50/100g", "Front"),
            ("Manufacturer", "Hindustan Unilever Ltd.", "Back"),
            ("Country of Origin", "India", "Back"),
            ("Date of Manufacture", "05/2026", "Back"),
            ("Best Before", "05/2028", "Back"),
            ("Batch No", "HUL2605A22", "Back"),
            ("Common Name", "Laundry Detergent", "Back"),
            ("Consumer Care", "1800-22-5000", "Back"),
        ],
        "classification": {"category": "Household & Personal Care", "subcategory": "Detergent",
                           "product_type": "Household & Personal Care", "confidence": 0.96},
        "decision": {"decision": "COMPLIANT",
                     "notes": "Non-food commodity — food-specific rules (FSSAI, nutritional information) not applicable."},
        "report": False,
        "final_notes": "Food-specific declaration rules are not applicable to this product. Other mandatory declarations verified.",
    },
{
        "number": "SAT-DEMO-2025-0006",
        "scenario": "PENDING",
        "days_ago": 0,
        "type": InspectionType.FOLLOW_UP,
        "mode": InspectionMode.PHYSICAL_PACKAGE,
        "location": "Apna Bazar, Gomti Nagar, Lucknow",
        "product": {
            "product_name": "Frooti Mango Drink 200ml",
            "product_brand": "Frooti",
            "manufacturer": "Parle Agro Pvt. Ltd.",
            "category": "Food & Beverages",
            "subcategory": "Mango Drink",
            "barcode": "8901234500095",
            "net_quantity": "200 ml",
            "mrp": "Rs. 20.00",
            "date_of_manufacture": "08/2026",
            "best_before": "02/2027",
            "country_of_origin": "India",
            "common_name": "Mango Drink",
            "consumer_care": "1800-22-9090",
            "unit_sale_price": "Rs. 10.00/100ml",
        },
        "evidence": [
            {"surface": Surface.FRONT, "quality": QualityStatus.ACCEPTABLE, "quality_score": 82,
             "label": "Front — principal display panel", "captured_at_offset_days": 0},
            {"surface": Surface.BACK, "quality": QualityStatus.ACCEPTABLE, "quality_score": 80,
             "label": "Back — declaration block", "captured_at_offset_days": 0},
        ],
        "ocr": [
            ("product_name", "Frooti Mango Drink", 0.98),
            ("net_quantity", "Net Content 200 ml", 0.97),
            ("mrp", "MRP Rs. 20.00", 0.96),
        ],
        "fields": [
            ("Product Name", "Frooti Mango Drink 200ml", "Front"),
            ("Brand", "Frooti", "Front"),
            ("Net Quantity", "200 ml", "Front"),
            ("MRP", "Rs. 20.00", "Front"),
            ("Maximum Retail Price", "Rs. 20.00", "Front"),
            ("Manufacturer", "Parle Agro Pvt. Ltd.", "Back"),
            ("Country of Origin", "India", "Back"),
            ("Date of Manufacture", "08/2026", "Back"),
            ("Best Before", "02/2027", "Back"),
            ("Batch No", "F2608C11", "Back"),
            ("Common Name", "Mango Drink", "Back"),
            ("Consumer Care", "1800-22-9090", "Back"),
            ("FSSAI License", "10012042000038", "Back"),
            ("Nutritional Info", "Energy 96 kcal per 200ml serving", "Back"),
        ],
        "classification": {"category": "Food & Beverages", "subcategory": "Mango Drink",
                           "product_type": "Food & Beverages", "confidence": 0.97},
        "decision": None,
        "report": False,
        "final_notes": "Analysis complete. Awaiting officer decision.",
    },
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_officer(db: Session) -> User:
    user = db.query(User).filter(User.email == "officer@consumer.gov.in").first()
    if not user:
        raise RuntimeError("Demo officer account was not created.")
    return user


def _upsert_demo_users(db: Session) -> User:
    """Create or update the three demo accounts. Never deletes real users."""
    officer = None
    for spec in DEMO_USERS:
        user = db.query(User).filter(User.email == spec["email"]).first()
        if user is None:
            user = User(
                email=spec["email"],
                password_hash=hash_password(DEMO_PASSWORD),
                full_name=spec["full_name"],
                role=spec["role"],
                department=spec["department"],
                jurisdiction=spec["jurisdiction"],
                employee_id=spec["employee_id"],
                email_verified=True,
                account_status=AccountStatus.ACTIVE,
            )
            db.add(user)
            db.flush()
            print(f"created : {spec['email']}")
        else:
            # Ensure demo accounts stay in a usable state.
            user.full_name = spec["full_name"]
            user.role = spec["role"]
            user.department = spec["department"]
            user.jurisdiction = spec["jurisdiction"]
            user.employee_id = spec["employee_id"]
            user.email_verified = True
            user.account_status = AccountStatus.ACTIVE
            print(f"updated : {spec['email']}")
        if not user.profile:
            user.profile = UserProfile(user_id=user.id)
        for key, value in spec["profile"].items():
            setattr(user.profile, key, value)
        if spec["email"] == "officer@consumer.gov.in":
            officer = user
    db.flush()
    return officer or _get_officer(db)


def _seed_users_and_legal(db: Session) -> User:
    officer = _upsert_demo_users(db)
    # Legal knowledge base — deterministic and idempotent.
    from app.services.legal_seed import seed_legal_data

    seed_legal_data(db)
    return officer


def _clean_demo_records(db: Session, officer: User) -> None:
    """Remove previously seeded demo records so re-runs stay idempotent."""
    numbers = [i["number"] for i in DEMO_INSPECTIONS]
    inspections = db.query(Inspection).filter(
        Inspection.inspection_number.in_(numbers)
    ).all()
    for i in inspections:
        db.delete(i)  # cascades evidence, ocr, fields, checks, findings,
        # classification, applicability, notifications, report metadata,
        # officer decisions.
    db.flush()

    # Audit events are not FK-cascadeable from inspections, and the demo seed
    # also emits officer-level events (LOGIN, REPORT_GENERATED), so remove every
    # prior demo-seeded audit row explicitly (they carry DEMO_MARKER metadata).
    stale_audit = [
        e for e in db.query(AuditEvent).filter(AuditEvent.user_id == officer.id).all()
        if e.metadata_json and e.metadata_json.get("demo_seed")
    ]
    for e in stale_audit:
        db.delete(e)
    db.flush()


def _build_inspection(db: Session, officer: User, spec: dict) -> Inspection:
    """Create one demo inspection with the full data chain."""
    now = datetime.now(timezone.utc)
    created_at = now - timedelta(days=spec["days_ago"], hours=3)
    product = spec["product"]

    insp = Inspection(
        owner_id=officer.id,
        inspection_number=spec["number"],
        inspection_type=spec["type"],
        mode=spec["mode"],
        location=spec["location"],
        status=InspectionStatus.IN_PROGRESS,
        stage="SCANNING",
        product_name=product["product_name"],
        product_brand=product["product_brand"],
        manufacturer=product["manufacturer"],
        category=product["category"],
        subcategory=product["subcategory"],
        barcode=product["barcode"],
        net_quantity=product["net_quantity"],
        mrp=product["mrp"],
        date_of_manufacture=product["date_of_manufacture"],
        best_before=product["best_before"],
        country_of_origin=product["country_of_origin"],
        common_name=product["common_name"],
        consumer_care=product["consumer_care"],
        unit_sale_price=product.get("unit_sale_price"),
        is_demo=True,
        created_at=created_at,
        updated_at=created_at,
    )
    db.add(insp)
    db.flush()

    # --- evidence metadata (no fake image files / no image_url anywhere) ---
    evidence_by_surface: dict = {}
    for ev_spec in spec["evidence"]:
        asset = EvidenceAsset(
            inspection_id=insp.id,
            surface=ev_spec["surface"],
            is_placeholder=True,  # demo metadata — no underlying image file
            quality_status=ev_spec["quality"],
            quality_score=ev_spec["quality_score"],
            label=ev_spec["label"],
            captured_at=created_at + timedelta(hours=1),
            original_filename=(
                f"demo_{spec['number']}_{ev_spec['surface'].value}" + "_view.jpg"
            ),
            mime_type="image/jpeg",
            file_size=None,
        )
        db.add(asset)
        evidence_by_surface[ev_spec["surface"]] = asset
    db.flush()

    # --- OCR results (simulated demo capture, never from a real image) ---
    for field, text, confidence in spec["ocr"]:
        db.add(OCRResult(
            inspection_id=insp.id,
            field=field,
            text=text,
            confidence=confidence,
        ))
    db.flush()

    # --- extracted fields — source is DEMO_FIXTURE always ---
    for label, value, surface in spec["fields"]:
        ev = evidence_by_surface.get(Surface(surface)) if surface else None
        db.add(ExtractedField(
            inspection_id=insp.id,
            evidence_id=ev.id if ev else None,
            label=label,
            value=value,
            source="DEMO_FIXTURE",
            ocr_confidence=0.93,
            extraction_confidence=0.9,
            extraction_mode=ExtractionMode.DEMO,
            status="accepted",
        ))
    db.flush()

    # --- classification + applicability ---
    cls = spec["classification"]
    db.add(Classification(
        inspection_id=insp.id,
        category=cls["category"],
        subcategory=cls["subcategory"],
        product_type=cls["product_type"],
        confidence=cls["confidence"],
        signals=["demo classification fixture", "deterministic demo"],
        candidates=[{"label": cls["category"], "confidence": cls["confidence"]}],
    ))
    is_food = cls["category"] in {
        "Snacks & Confectionery", "Edible Oil & Fats", "Dairy Products",
        "Food & Beverages",
    }
    origin = (product["country_of_origin"] or "").strip().lower()
    db.add(ApplicabilityResult(
        inspection_id=insp.id,
        product_type=cls["product_type"],
        is_food=is_food,
        is_retail=True,
        is_imported=origin not in {"", "india", "made in india"},
        is_special_category=False,
        quantity_condition=product["net_quantity"],
        machine_checkable_count=12,
        officer_review_count=4,
    ))
    db.flush()

    # --- compliance checks + findings via the ACTUAL engine ---
    from app.routers.analysis import _run_compliance

    compliance = _run_compliance(db, insp, officer)
    total = sum(compliance["summary"].values())
    rate = round(
        (compliance["summary"]["pass"] / total) * 100, 1
    ) if total else 0.0

    insp.stage = "COMPLIANCE_EVALUATED"
    insp.analytics_score = rate
    insp.category = cls["category"]
    insp.subcategory = cls["subcategory"]

    decision_spec = spec.get("decision") or {}
    decision_value = decision_spec.get("decision")

    if decision_value is None:
        insp.officer_decision = OfficerDecisionState.PENDING
        insp.status = InspectionStatus.UNDER_REVIEW
        insp.final_notes = spec.get("final_notes", "")
    else:
        insp.officer_decision = OfficerDecisionState(decision_value)
        insp.final_notes = spec.get("final_notes") or decision_spec.get("notes") or ""
        insp.decision_date = created_at + timedelta(hours=2)
        if decision_value == "COMPLIANT":
            insp.status = InspectionStatus.COMPLIANT
        elif decision_value == "NON-COMPLIANT":
            insp.status = InspectionStatus.NON_COMPLIANT
        else:
            insp.status = InspectionStatus.MANUAL_REVIEW
        db.add(OfficerDecision(
            inspection_id=insp.id,
            officer_id=officer.id,
            decision=OfficerDecisionState(decision_value),
            notes=decision_spec.get("notes"),
            previous_decision="Pending",
            decided_at=created_at + timedelta(hours=2),
        ))
    db.flush()
    return insp


def _audit(db: Session, officer: User, event_type: str, entity_type, entity_id,
           metadata: dict) -> None:
    db.add(AuditEvent(
        user_id=officer.id,
        actor_email=officer.email,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata_json=dict(metadata),
        ip_address="127.0.0.1",
    ))
    db.flush()


def _demo_events(db: Session, officer: User, insp: Inspection, spec: dict) -> None:
    """Notifications + audit events for one demo inspection."""
    number = insp.inspection_number
    events = [
        ("INSPECTION_CREATED", "inspection", {"inspection_number": number}),
        ("EVIDENCE_UPLOADED", "evidence", {"inspection_number": number}),
        ("ANALYSIS_RUN", "inspection", {"inspection_number": number}),
        ("COMPLIANCE_EVALUATED", "inspection", {"inspection_number": number}),
    ]
    if insp.officer_decision != OfficerDecisionState.PENDING:
        events.append(("OFFICER_DECISION_SET", "inspection",
                       {"inspection_number": number,
                        "decision": insp.officer_decision.value}))
    if insp.findings:
        events.append(("FINDING_CREATED", "inspection",
                       {"inspection_number": number}))

    for event_type, entity_type, meta in events:
        _audit(db, officer, event_type, entity_type, str(insp.id),
               {**DEMO_MARKER, **meta})

    db.add(NotificationRow(
        user_id=officer.id,
        title=f"Inspection created — {number}",
        body=f"{spec['product']['product_name']} registered for demonstration inspection.",
        notification_type=NotificationType.INSPECTION,
        related_inspection_id=insp.id,
    ))
    db.add(NotificationRow(
        user_id=officer.id,
        title=f"Analysis complete — {number}",
        body=(
            f"DEMO analysis finished for {spec['product']['product_name']}. "
            f"Awaiting officer review."
        ),
        notification_type=NotificationType.INSPECTION,
        related_inspection_id=insp.id,
    ))
    if insp.officer_decision != OfficerDecisionState.PENDING:
        db.add(NotificationRow(
            user_id=officer.id,
            title=f"Officer decision recorded — {number}",
            body=f"Final decision: {insp.officer_decision.value}.",
            notification_type=NotificationType.DECISION,
            related_inspection_id=insp.id,
        ))


def _generate_reports(db: Session, officer: User, insp: Inspection) -> None:
    """Generate the server-side PDF for inspections that request one."""
    from datetime import datetime as _dt

    from app.routers.reports import _build_pdf

    import hashlib

    try:
        out = _build_pdf(db, insp)
    except Exception as exc:  # pragma: no cover - reportlab must be installed
        print(f"  ! PDF generation skipped for {insp.inspection_number}: {exc}")
        return
    data = out.read_bytes()
    from app.config import settings as _settings

    try:
        # Store the path relative to upload_root (e.g. "reports/<file>.pdf")
        # so download_latest_report can resolve it back to disk.
        relative_path = str(out.relative_to(_settings.upload_root))
    except ValueError:  # pragma: no cover - unexpected out-of-root path
        relative_path = out.name
    checksum = hashlib.sha256(data).hexdigest()
    db.add(ReportMetadata(
        inspection_id=insp.id,
        generated_by=officer.id,
        file_name=out.name,
        file_path=relative_path,
        file_size=len(data),
        checksum=checksum,
        decision_at_generation=insp.officer_decision.value,
        generated_at=_dt.now(timezone.utc),
    ))
    insp.report_generated = True
    _audit(db, officer, "REPORT_GENERATED", "inspection", str(insp.id),
           {**DEMO_MARKER, "inspection_number": insp.inspection_number,
            "file_name": out.name, "checksum": checksum})


def main() -> None:
    db = SessionLocal()
    try:
        officer = _seed_users_and_legal(db)
        _clean_demo_records(db, officer)

        for spec in DEMO_INSPECTIONS:
            insp = _build_inspection(db, officer, spec)
            _demo_events(db, officer, insp, spec)
            summary = {
                out.value: sum(1 for c in insp.compliance_checks if c.outcome == out)
                for out in CheckOutcome
            }
            print(
                f"seeded : {insp.inspection_number} [{spec['scenario']}] "
                f"checks={len(insp.compliance_checks)} "
                f"findings={len(insp.findings)} "
                f"P={summary[CheckOutcome.PASS]} "
                f"R={summary[CheckOutcome.REVIEW]} "
                f"V={summary[CheckOutcome.VIOLATION]} "
                f"NA={summary[CheckOutcome.NOT_APPLICABLE]}"
            )
            if spec.get("report"):
                _generate_reports(db, officer, insp)
                print(f"  report: {insp.inspection_number} generated")
            db.flush()

        _audit(db, officer, "LOGIN", None, None,
               {**DEMO_MARKER, "detail": "Demo seed sign-in event"})
        welcome_exists = db.query(NotificationRow.id).filter(
            NotificationRow.user_id == officer.id,
            NotificationRow.title == "Welcome to SATYATAG (demo)",
        ).first()
        if not welcome_exists:
            db.add(NotificationRow(
                user_id=officer.id,
                title="Welcome to SATYATAG (demo)",
                body=(
                    "Six demo inspections are loaded with extracted fields, "
                    "compliance checks, findings and officer decisions. "
                    "Everything is DEMO DATA."
                ),
                notification_type=NotificationType.SYSTEM,
            ))
        db.commit()
        print(f"Done — demo dataset seeded. Login: officer@consumer.gov.in / {DEMO_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    main()