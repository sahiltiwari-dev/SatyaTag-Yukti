"""Online product listing checks — create listing records and run a deterministic
demo listing analysis (checks declared price / quantity / seller info against
the inspection's captured data)."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.classification import ListingAnalysis, ListingCheck
from app.models.enums import ListingCheckStatus, UserRole
from app.models.inspection import Inspection
from app.models.user import User

router = APIRouter(prefix="/api/inspections", tags=["listing"])


class ListingCreate(BaseModel):
    platform_name: str = "Marketplace"
    listing_url: str
    listing_title: str = ""
    listing_price: str = ""
    listing_quantity: str = ""
    seller_name: str = ""


def _get(db: Session, iid: str, user: User) -> Inspection:
    insp = db.query(Inspection).filter(Inspection.id == iid).first()
    if not insp:
        raise HTTPException(404, "Inspection not found.")
    if user.role == UserRole.OFFICER and str(insp.owner_id) != str(user.id):
        raise HTTPException(403, "Access denied.")
    return insp


@router.post("/{inspection_id}/listing", status_code=201)
def create_listing(
    inspection_id: str, payload: ListingCreate, request: Request,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    insp = _get(db, inspection_id, user)
    listing = ListingCheck(
        inspection_id=insp.id, platform_name=payload.platform_name,
        listing_url=payload.listing_url, listing_title=payload.listing_title,
        listing_price=payload.listing_price, listing_quantity=payload.listing_quantity,
        seller_name=payload.seller_name, status=ListingCheckStatus.CREATED,
    )
    db.add(listing)
    from app.services.audit import record_audit
    record_audit(db, "LISTING_ADDED", actor_id=user.id, actor_email=user.email,
                 entity_type="listing", metadata={"url": payload.listing_url},
                 ip_address=request.client.host if request.client else None)
    db.commit()
    db.refresh(listing)
    return {
        "id": str(listing.id), "inspection_id": str(insp.id),
        "platform_name": listing.platform_name, "listing_url": listing.listing_url,
        "listing_title": listing.listing_title, "listing_price": listing.listing_price,
        "listing_quantity": listing.listing_quantity, "seller_name": listing.seller_name,
        "status": listing.status.value,
    }


@router.get("/{inspection_id}/listing")
def list_listing_checks(
    inspection_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    insp = _get(db, inspection_id, user)
    items = db.query(ListingCheck).filter(ListingCheck.inspection_id == insp.id).order_by(
        ListingCheck.created_at.desc()
    ).all()
    return [
        {
            "id": str(l.id), "platform_name": l.platform_name,
            "listing_url": l.listing_url, "listing_title": l.listing_title,
            "listing_price": l.listing_price, "listing_quantity": l.listing_quantity,
            "seller_name": l.seller_name, "status": l.status.value,
        } for l in items
    ]


@router.post("/{inspection_id}/listing/{listing_id}/analyse")
def analyse_listing(
    inspection_id: str, listing_id: str, request: Request,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    insp = _get(db, inspection_id, user)
    listing = db.query(ListingCheck).filter(
        ListingCheck.id == listing_id, ListingCheck.inspection_id == insp.id,
    ).first()
    if not listing:
        raise HTTPException(404, "Listing check not found.")

    issues = []
    ok = []
    price_mismatch = None
    quantity_mismatch = None

    if insp.mrp:
        listing_price = (listing.listing_price or "").strip()
        if listing_price:
            try:
                listed = float(listing_price.replace("₹", "").replace("Rs.", "").strip())
                pkg = float(str(insp.mrp).replace("₹", "").replace("Rs.", "").strip())
                if listed > pkg * 1.02:
                    price_mismatch = (str(insp.mrp), listing_price)
                    issues.append(
                        f"Listed price ({listing_price}) exceeds the MRP on the package "
                        f"({insp.mrp}) — a violation of the maximum retail price declaration."
                    )
                else:
                    ok.append(f"Listed price ({listing_price}) is within the declared MRP ({insp.mrp}).")
            except ValueError:
                issues.append(f"Listed price '{listing_price}' is not numeric and could not be compared to MRP {insp.mrp}.")
        else:
            issues.append("The listing does not declare any price.")

    if insp.net_quantity:
        qty = (listing.listing_quantity or "").strip()
        if not qty:
            issues.append("The listing does not declare the net quantity.")
        elif insp.net_quantity.lower() not in qty.lower() and qty.lower() not in insp.net_quantity.lower():
            quantity_mismatch = (insp.net_quantity, qty)
            issues.append(
                f"Listed quantity '{qty}' does not match the package net quantity '{insp.net_quantity}'."
            )
        else:
            ok.append(f"Listed quantity ({qty}) matches the package net quantity ({insp.net_quantity}).")

    if not (listing.seller_name or "").strip():
        issues.append("The listing does not identify the seller — required under applicable e-commerce disclosure rules.")

    results = [{"status": "issue", "message": i} for i in issues] + [{"status": "ok", "message": i} for i in ok]
    summary = ("MULTIPLE_ISSUES" if len(issues) > 1 else
               "ISSUE_FOUND" if issues else "COMPLIANT")
    analysis = ListingAnalysis(
        listing_check_id=listing.id, status="COMPLETED",
        summary=summary, results={
            "issues": issues, "ok_checks": ok,
            "price_mismatch": price_mismatch, "quantity_mismatch": quantity_mismatch,
        },
        machine_checks=[{"label": "Price vs MRP", "passed": price_mismatch is None},
                        {"label": "Net quantity declared", "passed": bool(listing.listing_quantity)},
                        {"label": "Seller identity", "passed": bool(listing.seller_name)}],
    )
    db.add(analysis)
    listing.status = ListingCheckStatus.ANALYSED
    from app.services.audit import record_audit
    record_audit(db, "LISTING_ANALYSED", actor_id=user.id, actor_email=user.email,
                 entity_type="listing", entity_id=str(listing.id),
                 metadata={"summary": summary},
                 ip_address=request.client.host if request.client else None)
    db.commit()
    return {
        "id": str(analysis.id), "listing_id": str(listing.id),
        "status": analysis.status, "summary": summary,
        "results": analysis.results, "machine_checks": analysis.machine_checks,
        "analysed_at": datetime.now(timezone.utc).isoformat(),
        "demo": True,
        "note": "DEMO LISTING ANALYSIS — deterministic comparison of listing declarations against the captured package.",
    }