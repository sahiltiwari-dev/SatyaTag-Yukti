"""Evidence upload / retrieval routes.

Actual images are stored as real files under `settings.upload_root`
(backend/uploads/). PostgreSQL stores metadata only. Uploads are validated:
  - Extension must be in ALLOWED_EXTENSIONS
  - Client-supplied MIME type is checked against REJECTED_MIME_FRAGMENTS
  - Actual file bytes are decoded by Pillow to verify the file is a real image
    (magic-bytes detection). Client-claimed MIME is never trusted for safety.
  - Size is capped at MAX_UPLOAD_BYTES
  - Server-generated UUIDs are used for storage names (no path traversal)
  - Ownership checks enforce RBAC
"""
import hashlib
import io
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.config import settings
from app.database import get_db
from app.models.enums import QualityStatus, Surface, UserRole, ExtractionMode
from app.models.evidence import EvidenceAsset, OCRResult, ExtractedField
from app.services.ocr import run_paddle_ocr_bytes, is_ocr_available
import logging

logger = logging.getLogger(__name__)
from app.models.inspection import Inspection
from app.models.user import User

router = APIRouter(prefix="/api", tags=["evidence"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
REJECTED_MIME_FRAGMENTS = ("application/pdf", "text/", "video/", "audio/")

# Pillow format names that map to accepted image types
PILLOW_ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP", "GIF", "BMP"}


def _upload_root() -> Path:
    root = settings.upload_root
    root.mkdir(parents=True, exist_ok=True)
    return root


def _path_inside_root(path: Path) -> bool:
    root = _upload_root().resolve()
    try:
        path.resolve().relative_to(root)
        return True
    except ValueError:
        return False


def _inspection_for(db: Session, user: User, inspection_id: str) -> Inspection:
    insp = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not insp:
        raise HTTPException(404, "Inspection not found.")
    if user.role == UserRole.OFFICER and str(insp.owner_id) != str(user.id):
        raise HTTPException(403, "Access denied.")
    return insp


def _evidence_for(db: Session, user: User, evidence_id: str):
    ev = db.query(EvidenceAsset).filter(EvidenceAsset.id == evidence_id).first()
    if not ev:
        raise HTTPException(404, "Evidence not found.")
    insp = db.query(Inspection).filter(Inspection.id == ev.inspection_id).first()
    if not insp:
        raise HTTPException(404, "Evidence not found.")
    if user.role == UserRole.OFFICER and str(insp.owner_id) != str(user.id):
        raise HTTPException(403, "Access denied.")
    return ev, insp


def _validated_extension(filename: str | None, content_type: str | None) -> tuple[str, str]:
    """Returns (extension, mime). Raises 400 on invalid/unsupported files.

    Only checks extension and client-supplied MIME. Actual bytes are verified
    separately by _verify_image_bytes() using Pillow (magic-bytes detection).
    """
    ext = Path(filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Only image files (JPG, PNG, WEBP, GIF, BMP) may be uploaded as evidence.",
        )
    mime = (content_type or "").lower()
    if any(fragment in mime for fragment in REJECTED_MIME_FRAGMENTS):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "PDFs, documents and videos are not accepted as evidence.",
        )
    if mime and mime != "application/octet-stream" and not mime.startswith("image/"):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Unsupported content type '{mime}'. Expected an image.",
        )
    return ext, mime


def _verify_image_bytes(data: bytes) -> str:
    """Verify that the file bytes are actually a valid image using Pillow.

    Returns the detected MIME type. Raises HTTP 400 if bytes are not a
    recognisable image format, regardless of what the client claimed.

    This prevents spoofed MIME types, scripts renamed with .png extensions,
    and other content-type confusion attacks.
    """
    try:
        from PIL import Image, UnidentifiedImageError

        img = Image.open(io.BytesIO(data))
        img.verify()  # Fully decode the header to catch truncated/corrupt files.
        fmt = img.format  # e.g. "PNG", "JPEG", "WEBP"
    except Exception:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "File content does not match a supported image format. "
            "Upload a valid JPG, PNG, WEBP, GIF, or BMP image.",
        )

    if fmt not in PILLOW_ALLOWED_FORMATS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Image format '{fmt}' is not accepted. "
            "Upload a JPG, PNG, WEBP, GIF, or BMP image.",
        )

    mime_map = {
        "JPEG": "image/jpeg",
        "PNG": "image/png",
        "WEBP": "image/webp",
        "GIF": "image/gif",
        "BMP": "image/bmp",
    }
    return mime_map.get(fmt, "image/jpeg")


@router.post("/inspections/{inspection_id}/evidence", status_code=status.HTTP_201_CREATED)
async def upload_evidence(
    inspection_id: str,
    file: UploadFile = File(...),
    surface: Surface = Form(..., description="Surface of the package"),
    quality_score: int = Form(0, ge=0, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    insp = _inspection_for(db, user, inspection_id)
    ext, mime = _validated_extension(file.filename, file.content_type)

    data = await file.read()
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The uploaded file is empty.")
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"File size exceeds the {settings.max_upload_bytes // (1024 * 1024)} MB limit.",
        )

    # Magic-bytes verification: use Pillow to confirm the bytes are a real image,
    # regardless of what the client claimed in Content-Type or filename.
    detected_mime = _verify_image_bytes(data)
    sha256_hex = hashlib.sha256(data).hexdigest()
    # Use Pillow-detected MIME rather than client-supplied value.
    mime = detected_mime
    insp_dir = _upload_root() / str(insp.id)
    insp_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{ext}"
    stored_path = (Path(str(insp.id)) / stored_name).as_posix()
    (insp_dir / stored_name).write_bytes(data)

    from app.services.audit import record_audit

    existing = (
        db.query(EvidenceAsset)
        .filter(EvidenceAsset.inspection_id == insp.id, EvidenceAsset.surface == surface)
        .first()
    )
    if existing:
        if existing.storage_path:
            old = _upload_root() / existing.storage_path
            if _path_inside_root(old) and old.exists():
                try:
                    old.unlink()
                except OSError:
                    pass
        existing.original_filename = file.filename[:255]
        existing.stored_filename = stored_name
        existing.mime_type = mime
        existing.file_size = len(data)
        existing.sha256 = sha256_hex
        existing.storage_path = stored_path
        existing.is_placeholder = False
        existing.captured_at = datetime.now(timezone.utc)
        if quality_score:
            existing.quality_score = quality_score
        ev = existing
    else:
        ev = EvidenceAsset(
            inspection_id=insp.id,
            surface=surface,
            original_filename=file.filename[:255],
            stored_filename=stored_name,
            mime_type=mime,
            file_size=len(data),
            sha256=sha256_hex,
            storage_path=stored_path,
            is_placeholder=False,
            captured_at=datetime.now(timezone.utc),
            quality_score=quality_score,
        )
        db.add(ev)
    db.flush()

    try:
        ocr_data = await run_paddle_ocr_bytes(data)
        for line in ocr_data.get("lines", []):
            db.add(OCRResult(
                inspection_id=insp.id,
                evidence_id=ev.id,
                text=line["text"],
                confidence=line["confidence"],
            ))
        extracted_dict = ocr_data.get("extracted", {})
        for label, val in extracted_dict.items():
            db.add(ExtractedField(
                inspection_id=insp.id,
                evidence_id=ev.id,
                label=label.replace("_", " ").title(),
                value=val,
                source=f"{surface.value} image",
                ocr_confidence=ocr_data.get("confidence", 90.0),
                extraction_confidence=ocr_data.get("confidence", 90.0),
                extraction_mode=ExtractionMode.OCR,
                status="accepted"
            ))
    except Exception as e:
        logger.exception("OCR execution failed for evidence %s: %s", ev.id, e)

    record_audit(db, "EVIDENCE_UPLOADED", actor_id=user.id, actor_email=user.email,
                 entity_type="evidence", metadata={"surface": surface.value,
                                                   "inspection_id": str(insp.id)})
    db.commit()
    db.refresh(ev)
    return {
        "id": str(ev.id),
        "inspection_id": str(insp.id),
        "inspection_number": insp.inspection_number,
        "surface": ev.surface.value,
        "original_filename": ev.original_filename,
        "mime_type": ev.mime_type,
        "file_size": ev.file_size,
        "sha256": ev.sha256,
        "url": f"/api/evidence/{ev.id}/file",
        "captured_at": ev.captured_at.isoformat() if ev.captured_at else None,
        "quality_status": ev.quality_status.value,
        "quality_score": ev.quality_score,
    }


@router.get("/inspections/{inspection_id}/evidence")
def list_evidence(inspection_id: str, db: Session = Depends(get_db),
                  user: User = Depends(get_current_user)):
    insp = _inspection_for(db, user, inspection_id)
    items = (
        db.query(EvidenceAsset)
        .filter(EvidenceAsset.inspection_id == insp.id)
        .order_by(EvidenceAsset.created_at.asc())
        .all()
    )
    return [
        {
            "id": str(ev.id),
            "inspection_id": str(insp.id),
            "surface": ev.surface.value,
            "original_filename": ev.original_filename,
            "mime_type": ev.mime_type,
            "file_size": ev.file_size,
            "sha256": ev.sha256,
            "url": f"/api/evidence/{ev.id}/file",
            "captured_at": ev.captured_at.isoformat() if ev.captured_at else None,
            "quality_status": ev.quality_status.value,
            "quality_score": ev.quality_score,
            "is_placeholder": ev.is_placeholder,
        }
        for ev in items
    ]


@router.get("/evidence/{evidence_id}/file")
def get_evidence_file(evidence_id: str, db: Session = Depends(get_db),
                      user: User = Depends(get_current_user)):
    ev, _insp = _evidence_for(db, user, evidence_id)
    if not ev.storage_path:
        raise HTTPException(404, "Evidence file unavailable.")
    path = _upload_root() / ev.storage_path
    if not _path_inside_root(path) or not path.exists():
        raise HTTPException(404, "Evidence file missing.")
    filename = ev.original_filename or path.name
    return FileResponse(path, media_type=ev.mime_type or "image/jpeg", filename=filename)


@router.delete("/evidence/{evidence_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_evidence(evidence_id: str, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    ev, _insp = _evidence_for(db, user, evidence_id)
    if ev.storage_path:
        path = _upload_root() / ev.storage_path
        if _path_inside_root(path) and path.exists():
            try:
                path.unlink()
            except OSError:
                pass
    from app.services.audit import record_audit
    record_audit(db, "EVIDENCE_REMOVED", actor_id=user.id, actor_email=user.email,
                 entity_type="evidence", metadata={"inspection_id": str(ev.inspection_id)})
    db.delete(ev)
    db.commit()