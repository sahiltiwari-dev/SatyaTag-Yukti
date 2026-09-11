"""E2E smoke test through the Vite dev proxy (localhost:5173 -> backend 8000)."""
import json
import time
import urllib.request
import uuid

BASE = "http://localhost:5173"
COOKIE = None


def req(method, path, body=None, expect=200):
    global COOKIE
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method,
                               headers={"Content-Type": "application/json"})
    if COOKIE:
        r.add_header("Cookie", COOKIE)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            COOKIE = (COOKIE or "") + ";" + resp.headers.get("Set-Cookie", "").split(";")[0] + ";"
            payload = resp.read().decode()
            status = resp.status
            return status, json.loads(payload) if payload else {}
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]


def req_raw(method, path):
    global COOKIE
    r = urllib.request.Request(BASE + path, method=method)
    if COOKIE:
        r.add_header("Cookie", COOKIE)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def main():
    email = f"smoke_{uuid.uuid4().hex[:8]}@example.com"
    print("== 1. Health ==")
    s, b = req("GET", "/api/health")
    print("  ", s, b)

    print("== 2. Signup ==")
    s, b = req("POST", "/api/auth/signup",
               {"email": email, "password": "Smoke#12345", "full_name": "Smoke Test Officer"})
    print("  ", s, b)
    dev_otp = None
    if isinstance(b, dict) and b.get("dev_otp"):
        dev_otp = b["dev_otp"]
    if s in (400, 409):
        print("  (user may exist; continuing with login)")
        s, b = req("POST", "/api/auth/login", {"email": email, "password": "Smoke#12345"})
        print("  login ->", s, b)

    if dev_otp:
        print("== 2b. Verify OTP ==")
        s, b = req("POST", "/api/auth/verify-email", {"email": email, "otp": dev_otp})
        print("  ", s, b)
        s, b = req("POST", "/api/auth/login", {"email": email, "password": "Smoke#12345"})
        print("  login ->", s, {k: v for k, v in b.items() if k != "user"} if isinstance(b, dict) else b)

    print("== 3. Me ==")
    s, b = req("GET", "/api/auth/me")
    print("  ", s, b if isinstance(b, str) else {k: b[k] for k in list(b)[:4]})

    print("== 4. Create inspection ==")
    s, b = req("POST", "/api/inspections", {"mode": "Physical Package"})
    print("  ", s, {k: b.get(k) for k in ("id", "inspection_number", "product_name", "status")} if isinstance(b, dict) else b)
    insp_id = b.get("id") if isinstance(b, dict) else None
    if not insp_id:
        print("  FAILED creating inspection:", b)
        return

    print("== 5. Run analysis ==")
    s, b = req("POST", f"/api/inspections/{insp_id}/analyse", {})
    print("  ", s, {k: b.get(k) for k in ("inspection_id", "compliance_rate", "demo")} if isinstance(b, dict) else b)

    print("== 6. Get analysis ==")
    s, b = req("GET", f"/api/inspections/{insp_id}/analysis")
    print("  ", s, "ok" if isinstance(b, dict) else b)

    print("== 7. Legal rules (live DB) ==")
    s, b = req("GET", "/api/legal/rules?limit=3")
    print("  ", s, len(b) if isinstance(b, list) else b)

    print("== 8. Listing check ==")
    s, b = req("POST", f"/api/inspections/{insp_id}/listing",
               {"platform_name": "ExampleMart", "listing_url": "https://example.com/item/xyz",
                "listing_title": "Test Prepack 500g", "listing_price": "₹150", "listing_quantity": "500 g"})
    print("  ", s, {k: b.get(k) for k in ("id", "platform_name", "status")} if isinstance(b, dict) else b)
    lc_id = b.get("id") if isinstance(b, dict) else None
    if lc_id:
        s, b = req("POST", f"/api/inspections/{insp_id}/listing/{lc_id}/analyse", {})
        print("    listing analyse ->", s, {k: b.get(k) for k in ("id", "status", "report")} if isinstance(b, dict) else b)

    print("== 9. Generate report ==")
    s, b = req("POST", f"/api/inspections/{insp_id}/report", {})
    print("  ", s, {k: b.get(k) for k in ("file_name", "url", "checksum", "file_size")} if isinstance(b, dict) else b)

    print("== 10. Download report ==")
    import urllib.request as ur
    import os
    s, pdf = req_raw("GET", f"/api/inspections/{insp_id}/report/download")
    print("  ", s, "PDF bytes:", len(pdf))
    os.makedirs("..\\smoke_download", exist_ok=True)
    with open("..\\smoke_download\\report_test.pdf", "wb") as f:
        f.write(pdf)
    print("  saved to ..\\smoke_download\\report_test.pdf  header:", pdf[:8])

    print("== 11. Notifications ==")
    s, b = req("GET", "/api/notifications")
    print("  ", s, (b if isinstance(b, str) else f"{len(b)} notifications"))

    print("== 12. Dashboard stats ==")
    s, b = req("GET", "/api/dashboard/stats")
    print("  ", s, b if isinstance(b, str) else {k: b[k] for k in list(b)[:6]})

    print("\nSMOKE TEST DONE ✅" if s == 200 else f"\nSMOKE TEST FAILED at step 12 (status {s})")


if __name__ == "__main__":
    main()