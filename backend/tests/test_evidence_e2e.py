"""Phase 7 — evidence upload / delete / re-upload / reject pipeline.

Uses the FastAPI TestClient (same pattern as test_inspections.py) so the
module runs inside pytest against the local PostgreSQL database — no live
server, no pre-seeded user, no dependency on checked-in image files.
"""
import hashlib

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

EMAIL = "officer@consumer.gov.in"
PASSWORD = "StrongPass123"

# A tiny but well-formed PNG header + payload. The backend validates the
# filename extension and MIME type, stores bytes verbatim, and returns the
# exact byte count on download, so any PNG-looking payload is acceptable.
PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n"
    b"\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00"
    b"\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01"
    b"\x0d\n\x2d\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


def login(db) -> None:
    from tests.conftest import create_verified_user

    create_verified_user(db)
    r = client.post("/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200
    assert "satyatag_session" in r.cookies


def test_evidence_upload_retrieve_replace_delete(db):
    login(db)
    created = client.post("/api/inspections", json={"mode": "Physical Package"}).json()
    iid = created["id"]

    # --- Upload Front -------------------------------------------------------
    r = client.post(
        f"/api/inspections/{iid}/evidence",
        files={"file": ("front.png", PNG_BYTES, "image/png")},
        data={"surface": "Front"},
    )
    assert r.status_code == 201, r.text
    ev = r.json()
    assert ev["surface"] == "Front"
    assert ev["sha256"] == hashlib.sha256(PNG_BYTES).hexdigest()
    assert ev["file_size"] == len(PNG_BYTES)
    assert ev["url"] == f"/api/evidence/{ev['id']}/file"
    print(f"  evidence {ev['id']} sha256={ev['sha256'][:16]}...")

    # --- List ---------------------------------------------------------------
    r = client.get(f"/api/inspections/{iid}/evidence")
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 1, items
    assert items[0]["id"] == ev["id"]

    # --- Download round-trips exact bytes -----------------------------------
    r = client.get(ev["url"])
    assert r.status_code == 200
    assert r.content == PNG_BYTES
    assert r.headers["content-type"] == "image/png"

    # --- Re-upload replaces the previous evidence for the same surface ------
    second_png = b"\x89PNG\r\n\x1a\n" + b"second-front-bytes-v2"
    r = client.post(
        f"/api/inspections/{iid}/evidence",
        files={"file": ("front-v2.png", second_png, "image/png")},
        data={"surface": "Front", "quality_score": "88"},
    )
    assert r.status_code == 201, r.text
    new_ev = r.json()
    assert new_ev["id"] == ev["id"], "Re-upload should update the same row"
    assert new_ev["sha256"] == hashlib.sha256(second_png).hexdigest()
    assert new_ev["file_size"] == len(second_png)
    assert new_ev["quality_score"] == 88

    # New bytes are served.
    r = client.get(new_ev["url"])
    assert r.content == second_png

    # --- Delete --------------------------------------------------------------
    r = client.delete(f"/api/evidence/{new_ev['id']}")
    assert r.status_code == 204
    assert client.get(f"/api/evidence/{new_ev['id']}/file").status_code == 404

    # --- Rejects --------------------------------------------------------------
    # PDF must be rejected outright.
    r = client.post(
        f"/api/inspections/{iid}/evidence",
        files={"file": ("fake.pdf", b"%PDF-1.4 fake", "application/pdf")},
        data={"surface": "Back"},
    )
    assert r.status_code == 400, r.text
    assert "Only image files" in r.json()["detail"]

    # Executable with a non-image MIME type must also be rejected.
    r = client.post(
        f"/api/inspections/{iid}/evidence",
        files={"file": ("tool.exe", b"MZ\x90\x00", "application/x-executable")},
        data={"surface": "Back"},
    )
    assert r.status_code == 400, r.text

    # --- Second surface uploads independently ------------------------------
    r = client.post(
        f"/api/inspections/{iid}/evidence",
        files={"file": ("back.png", PNG_BYTES, "image/png")},
        data={"surface": "Back"},
    )
    assert r.status_code == 201, r.text

    items = client.get(f"/api/inspections/{iid}/evidence").json()
    assert {i["surface"] for i in items} == {"Back"}, items

    # --- Server-side ownership check ----------------------------------------
    client.post("/api/auth/logout")
    from tests.conftest import create_verified_user

    create_verified_user(db, email="other@consumer.gov.in")
    client.post("/api/auth/login",
                json={"email": "other@consumer.gov.in", "password": "StrongPass123"})
    r = client.get(f"/api/inspections/{iid}/evidence")
    assert r.status_code == 403