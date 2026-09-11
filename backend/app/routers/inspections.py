"""Inspection CRUD routes."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session, joinedload

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.enums import UserRole
from app.models.inspection import Inspection
from app.models.user import User
from app.schemas.inspection import (
    InspectionCreate, InspectionUpdate, OfficerDecisionRequest,
    serialize_inspection_full, serialize_inspection_list,
)

router = APIRouter(prefix="/api/inspections", tags=["inspections"])


def _next_number(db: Session) -> str:
    year = datetime.now(timezone.utc).year
    prefix = f"SAT-{year}-"
    last = db.query(Inspection.inspection_number).filter(
        Inspection.inspection_number.like(f"{prefix}%")
    ).order_by(Inspection.inspection_number.desc()).first()
    n = int(last[0].split("-")[-1]) + 1 if last else 1
    return f"{prefix}{n:06d}"


def _get(db: Session, iid: str, user: User) -> Inspection:
    insp = db.query(Inspection).filter(Inspection.id == iid).first()
    if not insp:
        raise HTTPException(404, "Inspection not found.")
    if user.role == UserRole.OFFICER and str(insp.owner_id) != str(user.id):
        raise HTTPException(403, "Access denied.")
    return insp


def _get_full(db: Session, iid: str, user: User) -> Inspection:
    insp = db.query(Inspection).options(
        joinedload(Inspection.owner), joinedload(Inspection.evidence),
        joinedload(Inspection.extracted_fields),
        joinedload(Inspection.compliance_checks), joinedload(Inspection.findings),
        joinedload(Inspection.classification), joinedload(Inspection.applicability),
    ).filter(Inspection.id == iid).first()
    if not insp:
        raise HTTPException(404, "Inspection not found.")
    if user.role == UserRole.OFFICER and str(insp.owner_id) != str(user.id):
        raise HTTPException(403, "Access denied.")
    return insp


@router.post("", status_code=status.HTTP_201_CREATED)
def create_inspection(
    payload: InspectionCreate, request: Request,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    insp = Inspection(
        owner_id=user.id, inspection_number=_next_number(db),
        inspection_type=payload.inspection_type, mode=payload.mode,
        location=payload.location, status=payload.status, stage=payload.stage,
        product_name=payload.product_name, product_brand=payload.product_brand,
        manufacturer=payload.manufacturer, category=payload.category,
        subcategory=payload.subcategory, barcode=payload.barcode,
        net_quantity=payload.net_quantity, mrp=payload.mrp,
        date_of_manufacture=payload.date_of_manufacture,
        best_before=payload.best_before,
        country_of_origin=payload.country_of_origin,
        common_name=payload.common_name, consumer_care=payload.consumer_care,
        unit_sale_price=payload.unit_sale_price, is_demo=payload.is_demo,
    )
    db.add(insp)
    from app.services.audit import record_audit
    record_audit(db, "INSPECTION_CREATED", actor_id=user.id,
                 actor_email=user.email, entity_type="inspection",
                 metadata={"number": insp.inspection_number},
                 ip_address=request.client.host if request.client else None)
    db.commit()
    db.refresh(insp)
    return serialize_inspection_full(insp)


@router.get("")
def list_inspections(
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
    search: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    mode: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    q = db.query(Inspection).options(
        joinedload(Inspection.owner), joinedload(Inspection.evidence)
    )
    if user.role == UserRole.OFFICER:
        q = q.filter(Inspection.owner_id == user.id)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (Inspection.inspection_number.ilike(like))
            | (Inspection.product_name.ilike(like))
            | (Inspection.location.ilike(like))
        )
    if status_filter:
        q = q.filter(Inspection.status == status_filter)
    if mode:
        q = q.filter(Inspection.mode == mode)
    total = q.count()
    items = q.order_by(Inspection.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "items": [serialize_inspection_list(i) for i in items],
        "total": total, "limit": limit, "offset": offset,
    }


@router.get("/{inspection_id}")
def get_inspection(
    inspection_id: str, db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return serialize_inspection_full(_get_full(db, inspection_id, user))


@router.patch("/{inspection_id}")
def update_inspection(
    inspection_id: str, payload: InspectionUpdate,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    insp = _get(db, inspection_id, user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(insp, field, value)
    from app.services.audit import record_audit
    record_audit(db, "INSPECTION_UPDATED", actor_id=user.id,
                 actor_email=user.email, entity_type="inspection",
                 entity_id=str(insp.id))
    db.commit()
    db.refresh(insp)
    return serialize_inspection_full(insp)


@router.delete("/{inspection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inspection(
    inspection_id: str, db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    insp = _get(db, inspection_id, user)
    from app.services.audit import record_audit
    record_audit(db, "INSPECTION_DELETED", actor_id=user.id,
                 actor_email=user.email, entity_type="inspection",
                 entity_id=str(insp.id))
    db.delete(insp)
    db.commit()


@router.post("/{inspection_id}/decision")
def set_officer_decision(
    inspection_id: str, payload: OfficerDecisionRequest,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    insp = _get(db, inspection_id, user)
    prev = insp.officer_decision.value
    insp.officer_decision = payload.decision
    insp.final_notes = payload.notes
    insp.decision_date = datetime.now(timezone.utc)
    from app.services.audit import record_audit
    record_audit(db, "OFFICER_DECISION_SET", actor_id=user.id,
                 actor_email=user.email, entity_type="inspection",
                 entity_id=str(insp.id),
                 metadata={"decision": insp.officer_decision.value,
                           "previous": prev})
    db.commit()
    db.refresh(insp)
    return serialize_inspection_full(insp)