"""Phase 8 — analysis engine, compliance evaluation, PDF reports, listing checks,
dashboard stats and notifications."""
from fastapi.testclient import TestClient

from app.main import app
from app.models import Inspection

client = TestClient(app)

EMAIL = "officer@consumer.gov.in"
PASSWORD = "StrongPass123"


def login(db) -> None:
    client.post("/api/auth/logout")
    from tests.conftest import create_verified_user

    create_verified_user(db)
    r = client.post(
        "/api/auth/login", json={"email": EMAIL, "password": PASSWORD}
    )
    assert r.status_code == 200
    assert "satyatag_session" in r.cookies


def make_inspection(db, **overrides) -> dict:
    payload = {
        "inspection_type": "Routine",
        "mode": "Physical Package",
        "location": "Retail Store, Chandni Chowk",
        "stage": "SETUP",
        "status": "In Progress",
        "product_name": "Atta Noodles",
        "product_brand": "Demo Foods",
        "manufacturer": "Demo Foods Pvt. Ltd.",
        "net_quantity": "200 g",
        "mrp": "Rs. 70.00",
        "date_of_manufacture": "07/2025",
        "best_before": "07/2026",
        "country_of_origin": "India",
        "common_name": "Vermicelli Noodles",
        "consumer_care": "1800-123-4567",
        "category": "Food & Beverages",
    }
    payload.update(overrides)
    r = client.post("/api/inspections", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


def test_analysis_requires_auth(db):
    r = client.post("/api/inspections/00000000-0000-0000-0000-000000000000/analyse")
    assert r.status_code == 401


def test_analysis_runs_end_to_end(db):
    login(db)
    insp = make_inspection(db)
    r = client.post(f"/api/inspections/{insp['id']}/analyse")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["inspection_id"] == insp["id"]
    assert body["inspection_number"] == insp["inspection_number"]
    assert body["demo"] is True
    assert body["classification"]["category"] is not None
    assert body["summary"]["pass"] >= 1
    assert body["compliance_rate"] > 0

    stored = db.query(Inspection).filter(Inspection.id == insp["id"]).first()
    assert stored is not None
    assert stored.compliance_checks, "expected compliance checks"
    assert stored.findings, "expected findings"
    assert stored.classification is not None
    assert stored.stage == "COMPLIANCE_EVALUATED"


def test_analysis_is_idempotent(db):
    login(db)
    insp = make_inspection(db)
    client.post(f"/api/inspections/{insp['id']}/analyse")
    first = client.get(f"/api/inspections/{insp['id']}/analysis").json()
    client.post(f"/api/inspections/{insp['id']}/analyse")
    second = client.get(f"/api/inspections/{insp['id']}/analysis").json()
    assert len(first["checks"]) == len(second["checks"])
def test_analysis_missing_mandatory_fields_yields_violation(db):
    login(db)
    insp = make_inspection(
        db, net_quantity=None, mrp=None, manufacturer=None,
        consumer_care=None,
    )
    r = client.post(f"/api/inspections/{insp['id']}/analyse")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["summary"]["violation"] >= 1


def test_finding_decision(db):
    login(db)
    insp = make_inspection(db)
    client.post(f"/api/inspections/{insp['id']}/analyse")
    analysis = client.get(f"/api/inspections/{insp['id']}/analysis").json()
    assert analysis["findings"], "expected findings"
    fid = analysis["findings"][0]["id"]
    r = client.post(
        f"/api/inspections/{insp['id']}/findings/{fid}/decision",
        json={"decision": "Confirmed", "notes": "Verified against package."},
    )
    assert r.status_code == 200, r.text
    assert r.json()["officer_decision"] == "Confirmed"
    assert r.json()["status"] == "Potential Violation"


def test_report_generation_and_download(db):
    login(db)
    insp = make_inspection(db)
    client.post(f"/api/inspections/{insp['id']}/analyse")
    r = client.post(f"/api/inspections/{insp['id']}/report")
    assert r.status_code == 200, r.text
    meta = r.json()
    assert meta["file_name"].endswith(".pdf")
    assert meta["checksum"]
    assert meta["url"]

    download = client.get(f"/api/inspections/{insp['id']}/report/download")
    assert download.status_code == 200
    assert download.headers["content-type"] == "application/pdf"
    assert download.content[:5] == b"%PDF-"

    listed = client.get(f"/api/inspections/{insp['id']}/report/metadata").json()
    assert len(listed) == 1


def test_listing_check_and_analysis(db):
    login(db)
    insp = make_inspection(db, mrp="Rs. 70.00", net_quantity="200 g")
    r = client.post(
        f"/api/inspections/{insp['id']}/listing",
        json={
            "platform_name": "DemoMart",
            "listing_url": "https://demomart.in/p/atta-noodles-200g",
            "listing_title": "Atta Noodles 200g",
            "listing_price": "₹85",
            "listing_quantity": "200g",
            "seller_name": "DemoSeller",
        },
    )
    assert r.status_code == 201, r.text
    listing_id = r.json()["id"]

    a = client.post(f"/api/inspections/{insp['id']}/listing/{listing_id}/analyse")
    assert a.status_code == 200, a.text
    body = a.json()
    assert body["demo"] is True
    assert any("exceeds the MRP" in m for m in body["results"]["issues"])


def test_dashboard_stats_and_analytics(db):
    login(db)
    make_inspection(db)
    r = client.get("/api/dashboard/stats")
    assert r.status_code == 200
    assert r.json()["total_inspections"] == 1

    a = client.get("/api/analytics/overview")
    assert a.status_code == 200
    assert a.json()["total_inspections"] == 1


def test_legal_routes(db):
    login(db)
    r = client.get("/api/legal/rules")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1
    rule = data["items"][0]
    detail = client.get(f"/api/legal/rules/{rule['id']}")
    assert detail.status_code == 200
    assert "amendments" in detail.json()


def test_notifications_and_user_profile(db):
    login(db)
    me = client.get("/api/users/me")
    assert me.status_code == 200
    assert me.json()["email"] == EMAIL

    notifs = client.get("/api/notifications")
    assert notifs.status_code == 200
    assert "unread_count" in notifs.json()