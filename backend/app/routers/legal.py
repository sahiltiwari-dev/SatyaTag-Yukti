"""Legal Metrology database routes — read-only access to legal rules."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.legal import LegalAmendment, LegalDocument, LegalRule, LegalRuleVersion, LegalSource
from app.models.user import User

router = APIRouter(prefix="/api/legal", tags=["legal"])


def _ser_rule(r: LegalRule, include_versions: bool = False, include_doc: bool = False) -> dict:
    data = {
        "id": str(r.id), "document_id": str(r.document_id),
        "rule_number": r.rule_number, "title": r.title,
        "description": r.description, "category": r.category,
        "subcategory": r.subcategory,
        "check_type": r.check_type.value if r.check_type else "PRESENCE",
        "severity": r.severity.value if r.severity else "MINOR",
        "status": r.status.value if r.status else "CURRENT",
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }
    if include_versions and hasattr(r, "versions") and r.versions:
        data["versions"] = [{
            "id": str(v.id), "version": v.version, "title": v.title,
            "description": v.description, "content": v.content,
            "effective_date": v.effective_date.isoformat() if v.effective_date else None,
            "source_url": v.source_url,
            "status": v.status.value if v.status else "CURRENT",
            "change_note": v.change_note,
        } for v in r.versions]
    if include_doc and hasattr(r, "document") and r.document:
        d = r.document
        data["document"] = {
            "id": str(d.id), "source_id": str(d.source_id) if d.source_id else None,
            "title": d.title, "reference": d.reference,
            "document_type": d.document_type,
            "status": d.status.value if d.status else "CURRENT",
            "effective_date": d.effective_date.isoformat() if d.effective_date else None,
            "source_url": d.source_url,
        }
    return data


@router.get("/rules")
def list_rules(
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
    search: Optional[str] = Query(None), category: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = Query(None), check_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0),
):
    q = db.query(LegalRule).options(joinedload(LegalRule.document), joinedload(LegalRule.versions))
    if search:
        like = f"%{search}%"
        q = q.filter((LegalRule.title.ilike(like)) | (LegalRule.rule_number.ilike(like)) | (LegalRule.description.ilike(like)))
    if category: q = q.filter(LegalRule.category == category)
    if status_filter: q = q.filter(LegalRule.status == status_filter)
    if severity: q = q.filter(LegalRule.severity == severity)
    if check_type: q = q.filter(LegalRule.check_type == check_type)
    total = q.count()
    items = q.order_by(LegalRule.rule_number.asc()).offset(offset).limit(limit).all()
    seen, unique = set(), []
    for r in items:
        if r.id not in seen:
            seen.add(r.id); unique.append(r)
    return {"items": [_ser_rule(r, True, True) for r in unique], "total": total, "limit": limit, "offset": offset}


@router.get("/rules/{rule_id}")
def get_rule(rule_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.query(LegalRule).options(joinedload(LegalRule.document), joinedload(LegalRule.versions)).filter(LegalRule.id == rule_id).first()
    if not r: raise HTTPException(404, "Rule not found.")
    data = _ser_rule(r, True, True)
    amendments = db.query(LegalAmendment).filter(LegalAmendment.rule_id == r.id).all()
    data["amendments"] = [{"id": str(a.id), "title": a.title, "reference": a.reference,
        "effective_date": a.effective_date.isoformat() if a.effective_date else None,
        "amends": a.amends, "status": a.status.value if a.status else "CURRENT"} for a in amendments]
    return data


@router.get("/documents")
def list_documents(
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
    search: Optional[str] = Query(None), status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
):
    q = db.query(LegalDocument).options(joinedload(LegalDocument.source))
    if search:
        like = f"%{search}%"
        q = q.filter((LegalDocument.title.ilike(like)) | (LegalDocument.reference.ilike(like)))
    if status_filter: q = q.filter(LegalDocument.status == status_filter)
    total = q.count()
    items = q.order_by(LegalDocument.title.asc()).offset(offset).limit(limit).all()
    seen, unique = set(), []
    for d in items:
        if d.id not in seen:
            seen.add(d.id); unique.append(d)
    return {"items": [{"id": str(d.id), "title": d.title, "reference": d.reference,
        "document_type": d.document_type, "status": d.status.value if d.status else "CURRENT",
        "effective_date": d.effective_date.isoformat() if d.effective_date else None,
        "source_url": d.source_url} for d in unique], "total": total, "limit": limit, "offset": offset}


@router.get("/sources")
def list_sources(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return [{"id": str(s.id), "title": s.title, "source_organization": s.source_organization,
            "source_url": s.source_url} for s in db.query(LegalSource).order_by(LegalSource.title.asc()).all()]


@router.get("/categories")
def list_categories(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from sqlalchemy import distinct
    return [c[0] for c in db.query(LegalRule.category).filter(LegalRule.category.isnot(None)).distinct().all() if c[0]]


@router.post("/seed")
def seed_legal_db(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Populate the legal database with authorised Indian Legal Metrology references."""
    from app.services.legal_seed import seed_legal_data
    result = seed_legal_data(db)
    return result
