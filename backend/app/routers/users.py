"""User profile and account management routes."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.user import User, UserProfile
from app.models.enums import UserRole

router = APIRouter(prefix="/api/users", tags=["users"])


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    jurisdiction: Optional[str] = None
    employee_id: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


def _serialize(u: User) -> dict:
    return {
        "id": str(u.id), "email": u.email, "full_name": u.full_name,
        "role": u.role.value, "department": u.department, "jurisdiction": u.jurisdiction,
        "employee_id": u.employee_id, "email_verified": u.email_verified,
        "account_status": u.account_status.value, "last_login": u.last_login_at.isoformat() if u.last_login_at else None,
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "profile": {
            "designation": u.profile.designation if u.profile else None,
            "phone": u.profile.phone if u.profile else None,
            "address": u.profile.address if u.profile else None,
        } if u.profile else None,
    }


@router.get("/me")
def get_profile(user: User = Depends(get_current_user)):
    return _serialize(user)


@router.patch("/me")
def update_profile(
    payload: ProfileUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = payload.model_dump(exclude_unset=True)
    profile_data = {}
    for key in ("designation", "phone", "address"):
        if key in data:
            profile_data[key] = data.pop(key)
    for key, value in data.items():
        setattr(user, key, value)
    if not user.profile:
        user.profile = UserProfile(user_id=user.id)
    for key, value in profile_data.items():
        setattr(user.profile, key, value)

    from app.services.audit import record_audit
    record_audit(db, "PROFILE_UPDATED", actor_id=user.id, actor_email=user.email,
                 entity_type="user", entity_id=str(user.id),
                 ip_address=request.client.host if request.client else None)
    db.commit()
    db.refresh(user)
    return _serialize(user)


@router.get("/me/sessions")
def list_sessions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.models.user import Session as SessionModel
    sessions = db.query(SessionModel).filter(
        SessionModel.user_id == user.id, SessionModel.revoked_at.is_(None),
    ).order_by(SessionModel.created_at.desc()).limit(20).all()
    return [
        {
            "id": str(s.id), "ip": s.ip_address, "user_agent": s.user_agent,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "expires_at": s.expires_at.isoformat() if s.expires_at else None,
        } for s in sessions
    ]


@router.get("/{user_id}")
def get_user_by_id(
    user_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    if user.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only administrators can view other user profiles.")
    target = db.query(User).options(joinedload(User.profile)).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found.")
    return _serialize(target)