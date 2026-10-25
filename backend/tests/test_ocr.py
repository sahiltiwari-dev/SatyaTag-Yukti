import io
import pytest
from PIL import Image, ImageDraw, ImageFont
from fastapi.testclient import TestClient
from app.main import app
from app.services.ocr import run_paddle_ocr_bytes, parse_label_text

def test_parse_label_text():
    sample_text = (
        "DELICIOUS SNACKS\n"
        "Manufactured by: Tasty Foods Ltd, Mumbai\n"
        "Net Qty: 200g\n"
        "MRP: ₹50.00 incl. of all taxes\n"
        "Best Before 6 months from packaging"
    )
    parsed = parse_label_text(sample_text)
    assert parsed.get("mrp") is not None
    assert "50" in parsed.get("mrp", "")
    assert parsed.get("net_quantity") is not None
    assert "200g" in parsed.get("net_quantity", "")
    assert parsed.get("manufacturer") is not None
    assert "Tasty Foods" in parsed.get("manufacturer", "")

@pytest.mark.anyio
async def test_run_paddle_ocr_bytes_fixture():
    # Create a small blank image with text drawn on it using Pillow
    img = Image.new("RGB", (400, 200), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((10, 10), "TEST PRODUCT", fill=(0, 0, 0))
    d.text((10, 50), "MRP: ₹120.00", fill=(0, 0, 0))
    d.text((10, 90), "NET QTY: 1kg", fill=(0, 0, 0))
    
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    b_data = buf.getvalue()
    
    res = await run_paddle_ocr_bytes(b_data)
    assert "full_text" in res
    assert "confidence" in res
    assert "extracted" in res
    assert res["extracted"].get("mrp") is not None
    assert res["extracted"].get("net_quantity") is not None
