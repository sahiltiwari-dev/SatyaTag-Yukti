"""Server-generated PDF inspection reports.

Reports embed the uploaded evidence images, the compliance evaluation with
legal citations (document reference + rule + version), a SHA-256 fingerprint of
the report content, and a statutory disclaimer. PDFs are written under
`settings.upload_root` and recorded in `report_metadata`.
"""
import hashlib
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy.orm import Session, joinedload

from app.auth.dependencies import get_current_user
from app.config import settings
from app.database import get_db
from app.models.compliance import ComplianceCheck, Finding
from app.models.decisions import ReportMetadata
from app.models.inspection import Inspection
from app.models.legal import LegalDocument
from app.models.user import User

router = APIRouter(prefix="/api", tags=["reports"])

NAVY = colors.HexColor("#0F1F3D")
GOLD = colors.HexColor("#C9A227")
SLATE = colors.HexColor("#334155")
LIGHT = colors.HexColor("#F1F5F9")


def _safe(value, default: str = "—"):
    s = "" if value is None else str(value).strip()
    return s if s else default


def _inspection(db: Session, iid: str) -> Inspection:
    insp = db.query(Inspection).options(
        joinedload(Inspection.owner), joinedload(Inspection.evidence),
        joinedload(Inspection.extracted_fields),
        joinedload(Inspection.compliance_checks).joinedload(ComplianceCheck.rule),
        joinedload(Inspection.compliance_checks).joinedload(ComplianceCheck.rule_version),
        joinedload(Inspection.findings).joinedload(Finding.rule),
        joinedload(Inspection.classification), joinedload(Inspection.applicability),
    ).filter(Inspection.id == iid).first()
    if not insp:
        raise HTTPException(404, "Inspection not found.")
    return insp


def _fingerprint(insp: Inspection) -> str:
    h = hashlib.sha256()
    h.update(str(insp.id).encode())
    h.update((insp.inspection_number or "").encode())
    h.update((insp.officer_decision.value or "").encode())
    if insp.analytics_score is not None:
        h.update(str(insp.analytics_score).encode())
    for c in sorted(insp.compliance_checks, key=lambda x: str(x.id)):
        h.update(str(c.id).encode())
        h.update(c.outcome.value.encode())
        h.update((c.message or "").encode())
    for f in sorted(insp.findings, key=lambda x: str(x.id)):
        h.update(str(f.id).encode())
        h.update(f.officer_decision.value.encode())
    return h.hexdigest()[:32].upper()


def _outcome_color(outcome: str):
    return {
        "PASS": colors.HexColor("#15803D"), "REVIEW": colors.HexColor("#B45309"),
        "VIOLATION": colors.HexColor("#B91C1C"), "NOT_APPLICABLE": colors.HexColor("#64748B"),
    }.get(outcome, SLATE)
def _build_pdf(db: Session, insp: Inspection) -> Path:
    reports_dir = settings.upload_root / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    slug = insp.inspection_number.replace("/", "-")
    filename = f"SATYATAG-{slug}-{datetime.now(timezone.utc):%Y%m%d-%H%M}.pdf"
    out = reports_dir / filename

    doc = SimpleDocTemplate(
        str(out), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=16 * mm,
        title=f"SATYATAG Inspection Report — {insp.inspection_number}",
        author=insp.owner.full_name if insp.owner else "SATYATAG",
    )
    styles = getSampleStyleSheet()
    title = ParagraphStyle("TitleX", parent=styles["Title"], fontName="Helvetica-Bold",
                           fontSize=16, textColor=NAVY, spaceAfter=2, alignment=TA_LEFT)
    sub = ParagraphStyle("SubX", parent=styles["Normal"], fontName="Helvetica",
                         fontSize=9, textColor=GOLD, spaceAfter=10)
    h2 = ParagraphStyle("H2X", parent=styles["Heading2"], fontName="Helvetica-Bold",
                        fontSize=11, textColor=NAVY, spaceBefore=10, spaceAfter=4)
    body = ParagraphStyle("BodyX", parent=styles["Normal"], fontName="Helvetica",
                          fontSize=9, leading=12, textColor=SLATE)
    small = ParagraphStyle("SmallX", parent=body, fontSize=7.5, leading=9.5)
    verdict_ok = ParagraphStyle("VOk", parent=title, fontSize=13, textColor=colors.HexColor("#15803D"))
    verdict_bad = ParagraphStyle("VBad", parent=title, fontSize=13, textColor=colors.HexColor("#B91C1C"))
    verdict_med = ParagraphStyle("VMed", parent=title, fontSize=13, textColor=colors.HexColor("#B45309"))

    elements = []

    # --- Brand header ---
    header = Table([[Paragraph("SATYATAG", title),
                     Paragraph("AI-Assisted Compliance Support<br/>Legal Metrology (Packaged Commodities)",
                               sub)]], colWidths=[90 * mm, 70 * mm])
    header.setStyle(TableStyle([
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    elements.append(header)
    bar = Table([[""]], colWidths=[160 * mm], rowHeights=[1.2])
    bar.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), GOLD)]))
    elements.append(bar)
    elements.append(Spacer(1, 6 * mm))

    # --- Title block ---
    elements.append(Paragraph(f"Inspection Report — {insp.inspection_number}", title))
    elements.append(Paragraph(
        f"Generated {datetime.now(timezone.utc):%d %b %Y %H:%M IST} · "
        f"Officer: {_safe(insp.owner.full_name if insp.owner else None)} · "
        f"Mode: {_safe(insp.mode.value)} · Type: {_safe(insp.inspection_type.value)}", small))
    elements.append(Spacer(1, 4 * mm))
# --- Product summary table ---
    elements.append(Paragraph("1. Product", h2))
    product_rows = [
        ["Product Name", _safe(insp.product_name), "Brand", _safe(insp.product_brand)],
        ["Net Quantity", _safe(insp.net_quantity), "MRP", _safe(insp.mrp)],
        ["Manufacturer", _safe(insp.manufacturer), "Country of Origin", _safe(insp.country_of_origin)],
        ["Date of Manufacture", _safe(insp.date_of_manufacture), "Best Before / Expiry", _safe(insp.best_before)],
        ["Consumer Care", _safe(insp.consumer_care),
         "Category", _safe(insp.classification.category if insp.classification else None)],
    ]
    pt = Table(product_rows, colWidths=[35 * mm, 45 * mm, 35 * mm, 45 * mm])
    pt.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (-1, -1), SLATE),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, LIGHT]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    elements.append(pt)

    # --- Decision block ---
    elements.append(Paragraph("2. Officer Decision", h2))
    verdict_p = verdict_med
    text = ""
    if insp.officer_decision.value == "COMPLIANT":
        verdict_p = verdict_ok
    elif insp.officer_decision.value == "NON-COMPLIANT":
        verdict_p = verdict_bad
    elif insp.officer_decision.value == "MANUAL REVIEW":
        verdict_p = verdict_med
    else:
        text = " — awaits final officer decision"
    elements.append(Paragraph(_safe(insp.officer_decision.value) + text, verdict_p))
    elements.append(Paragraph(f"Officer notes: {_safe(insp.final_notes, 'No notes recorded.')}", body))

    # --- Evidence ---
    elements.append(Paragraph("3. Photographic Evidence", h2))
    real = [e for e in insp.evidence if e.storage_path and not e.is_placeholder]
    if real:
        imgs = []
        caps = []
        for e in real:
            p = settings.upload_root / e.storage_path
            if p.exists():
                try:
                    imgs.append(Image(str(p), width=48 * mm, height=38 * mm))
                except Exception:
                    imgs.append(Paragraph(f"{_safe(e.surface)} — image unavailable", small))
            else:
                imgs.append(Paragraph(f"{_safe(e.surface)} — file missing", small))
            caps.append(
                f"<b>{_safe(e.surface)}</b> — SHA-256: {_safe(e.sha256, 'n/a')}<br/>"
                f"Quality: {_safe(e.quality_status.value)} ({_safe(e.quality_score, '—')}/100)"
            )
        elements.append(Table([imgs], colWidths=[52 * mm] * len(imgs)))
        elements.append(Table([[Paragraph(c, small) for c in caps]], colWidths=[52 * mm] * len(caps)))
    else:
        elements.append(Paragraph("No photographic evidence was uploaded.", body))

    # --- Compliance checks ---
    elements.append(Paragraph("4. Compliance Evaluation", h2))
    if insp.compliance_checks:
        check_rows = [[Paragraph("<b>Rule / Citation</b>", small),
                       Paragraph("<b>Outcome</b>", small),
                       Paragraph("<b>Finding</b>", small)]]
        for c in sorted(insp.compliance_checks, key=lambda x: (x.rule.rule_number or "")):
            rule = c.rule
            ldoc = db.query(LegalDocument).filter(LegalDocument.id == rule.document_id).first() if rule else None
            citation = f"{_safe(rule.rule_number)} {_safe(rule.title)}"
            if ldoc:
                citation += f"<br/><font size=6>{_safe(ldoc.title)} · {_safe(ldoc.reference)}</font>"
            check_rows.append([
                Paragraph(citation, small),
                Paragraph(f"<b><font color=#{_outcome_color(c.outcome.value).hexval()[2:]}>{_safe(c.outcome.value)}</font></b>", small),
                Paragraph(_safe(c.message), small),
            ])
        ct = Table(check_rows, colWidths=[70 * mm, 20 * mm, 68 * mm])
        ct.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        elements.append(ct)
    else:
        elements.append(Paragraph("No compliance checks have been run for this inspection.", body))

    if insp.findings:
        elements.append(Paragraph("5. Findings", h2))
        for f in sorted(insp.findings, key=lambda x: x.severity.value):
            elements.append(Paragraph(f"<b>[{_safe(f.finding_type)}] {_safe(f.title)}</b> "
                                      f"(severity: {_safe(f.severity.value)})", body))
            elements.append(Paragraph(
                f"{_safe(f.description)}<br/>Officer decision: <b>{_safe(f.officer_decision.value)}</b>"
                + (f" — {f.officer_notes}" if f.officer_notes else ""), small))
            elements.append(Spacer(1, 1.5 * mm))

    # --- Fingerprint & disclaimer ---
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph("6. Compliance Fingerprint", h2))
    elements.append(Paragraph(
        f"<font face='Courier' size='7'>{_fingerprint(insp)}</font><br/>"
        f"Analytics score: <b>{_safe(insp.analytics_score, 'n/a')}</b> · "
        f"Status: {_safe(insp.status.value)}", small))
    elements.append(Spacer(1, 2 * mm))
    sep = Table([[""]], colWidths=[160 * mm], rowHeights=[0.6])
    sep.setStyle(TableStyle([("LINEABOVE", (0, 0), (-1, -1), 0.6, colors.HexColor("#CBD5E1"))]))
    elements.append(sep)
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph(
        "<b>Disclaimer.</b> This report is generated by SATYATAG, an AI-assisted "
        "enforcement-support system. It does not constitute a statutory inspection "
        "or a final legal determination. Output is for enforcement-support only and "
        "must be reviewed and validated by a legal metrology officer. "
        "Rule citations reference official sources as curated in the legal database.", small))

    doc.build(elements)
    return out


@router.post("/inspections/{inspection_id}/report")
def generate_report(
    inspection_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    insp = _inspection(db, inspection_id)
    if user.role.value != "admin" and str(insp.owner_id) != str(user.id):
        raise HTTPException(403, "Access denied.")
    out = _build_pdf(db, insp)
    data = out.read_bytes()
    fp = hashlib.sha256(data).hexdigest()
    meta = ReportMetadata(
        inspection_id=insp.id, generated_by=user.id,
        file_name=out.name, file_path=str(out.relative_to(settings.upload_root)),
        file_size=len(data), checksum=fp,
        decision_at_generation=insp.officer_decision.value,
        generated_at=datetime.now(timezone.utc),
    )
    db.add(meta)
    insp.report_generated = True
    from app.services.audit import record_audit
    record_audit(db, "REPORT_GENERATED", actor_id=user.id, actor_email=user.email,
                 entity_type="inspection", entity_id=str(insp.id),
                 metadata={"file_name": out.name, "checksum": fp})
    db.commit()
    return {
        "file_name": out.name,
        "url": f"/api/inspections/{inspection_id}/report/download",
        "checksum": fp, "file_size": len(data),
        "decision_at_generation": insp.officer_decision.value,
        "generated_at": meta.generated_at.isoformat() if meta.generated_at else None,
    }


@router.get("/inspections/{inspection_id}/report/download")
def download_latest_report(
    inspection_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    meta = db.query(ReportMetadata).filter(ReportMetadata.inspection_id == inspection_id).order_by(
        ReportMetadata.created_at.desc()
    ).first()
    if not meta or not meta.file_path:
        raise HTTPException(404, "No report has been generated for this inspection.")
    path = settings.upload_root / meta.file_path
    if not path.exists():
        raise HTTPException(404, "Report file missing on disk.")
    return FileResponse(path, media_type="application/pdf", filename=meta.file_name)


@router.get("/inspections/{inspection_id}/report/metadata")
def report_metadata(
    inspection_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    metas = db.query(ReportMetadata).filter(ReportMetadata.inspection_id == inspection_id).order_by(
        ReportMetadata.created_at.desc()
    ).limit(10).all()
    return [
        {
            "id": str(m.id), "file_name": m.file_name, "file_size": m.file_size,
            "checksum": m.checksum, "decision_at_generation": m.decision_at_generation,
            "generated_at": m.generated_at.isoformat() if m.generated_at else None,
            "url": f"/api/inspections/{inspection_id}/report/download",
        } for m in metas
    ]