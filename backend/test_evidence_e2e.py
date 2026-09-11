"""Quick E2E test for evidence upload/delete/re-upload/reject."""
import requests
import json

BASE = "http://127.0.0.1:8000"
EMAIL = "test.e2e@example.com"
PASSWORD = "Test1234!"
TEST_IMG = "test_lays_front.png"

s = requests.Session()
# Login
r = s.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
print("✅ Login OK")

# Create inspection
r = s.post(f"{BASE}/api/inspections", json={"product_name": "Test Product", "product_category": "Snacks"})
assert r.status_code == 201, f"Create inspection failed: {r.status_code} {r.text}"
insp_id = r.json()["id"]
print(f"✅ Inspection created: {insp_id}")

# Upload Front
with open(TEST_IMG, "rb") as f:
    r = s.post(f"{BASE}/api/inspections/{insp_id}/evidence",
               files={"file": ("front.png", f, "image/png")},
               data={"surface": "Front"})
assert r.status_code == 201, f"Upload failed: {r.status_code} {r.text}"
ev = r.json()
ev_id = ev["id"]
print(f"✅ Upload Front: evidence {ev_id}, sha256={ev['sha256'][:16]}...")

# List evidence
r = s.get(f"{BASE}/api/inspections/{insp_id}/evidence")
assert r.status_code == 200 and len(r.json()) == 1, f"List failed: {r.json()}"
print(f"✅ List: {len(r.json())} evidence(s)")

# Get file
r = s.get(f"{BASE}/api/evidence/{ev_id}/file")
assert r.status_code == 200 and len(r.content) == 3883, f"File failed: {r.status_code} size={len(r.content)}"
print(f"✅ File retrieval: {len(r.content)} bytes, type={r.headers['content-type']}")

# Delete
r = s.delete(f"{BASE}/api/evidence/{ev_id}")
assert r.status_code == 204, f"Delete failed: {r.status_code} {r.text}"
print("✅ Delete OK")

# Re-upload Front (should work now)
with open(TEST_IMG, "rb") as f:
    r = s.post(f"{BASE}/api/inspections/{insp_id}/evidence",
               files={"file": ("front2.png", f, "image/png")},
               data={"surface": "Front"})
assert r.status_code == 201, f"Re-upload failed: {r.status_code} {r.text}"
new_ev_id = r.json()["id"]
print(f"✅ Re-upload Front: {new_ev_id}")

# Old file should be gone
r = s.get(f"{BASE}/api/evidence/{ev_id}/file")
assert r.status_code in (404, 403), f"Old file should be gone, got {r.status_code}"
print("✅ Old file confirmed removed")

# Reject PDF
r = s.post(f"{BASE}/api/inspections/{insp_id}/evidence",
           files={"file": ("test.pdf", b"%PDF-1.4 fake", "application/pdf")},
           data={"surface": "Back"})
assert r.status_code == 400, f"PDF should be rejected: {r.status_code} {r.text}"
print(f"✅ PDF rejected: {r.json()['detail']}")

# Reject non-image mime
r = s.post(f"{BASE}/api/inspections/{insp_id}/evidence",
           files={"file": ("test.exe", b"MZ\x90\x00", "application/x-executable")},
           data={"surface": "Back"})
assert r.status_code == 400, f"EXE should be rejected: {r.status_code}"
print("✅ EXE rejected")

# Upload Back
with open(TEST_IMG, "rb") as f:
    r = s.post(f"{BASE}/api/inspections/{insp_id}/evidence",
               files={"file": ("back.png", f, "image/png")},
               data={"surface": "Back"})
assert r.status_code == 201, f"Upload Back failed: {r.status_code}"
print(f"✅ Upload Back: {r.json()['id']}")

# List should show 2
r = s.get(f"{BASE}/api/inspections/{insp_id}/evidence")
assert r.status_code == 200 and len(r.json()) == 2, f"Expected 2, got {len(r.json())}"
print("✅ List shows 2 evidence items")

print("\n🎉 ALL EVIDENCE E2E TESTS PASSED")
