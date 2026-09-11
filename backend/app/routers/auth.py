"""Authentication routes: signup, login, logout, session user, password change."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import (
    SESSION_COOKIE,
    create_session,
    get_current_user,
    revoke_session,
)
from app.auth.security import hash_password, verify_password
from app.database import get_db
from app.models import User, UserProfile
from app.models.enums import AccountStatus, UserRole
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    LoginResponse,
    SignupRequest,
    SignupResponse,
    UserOut,
    mask_email,
)
from app.services.audit import record_audit

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, request: Request, db: Session = Depends(get_db)):
    email = payload.email.lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=UserRole.OFFICER,
        department=payload.department,
        jurisdiction=payload.jurisdiction,
        employee_id=payload.employee_id,
        email_verified=False,
        account_status=AccountStatus.PENDING_VERIFICATION,
    )
    db.add(user)
    db.flush()
    db.add(UserProfile(user_id=user.id))
    record_audit(
        db,
        "ACCOUNT_CREATED",
        actor_id=user.id,
        actor_email=user.email,
        entity_type="user",
        entity_id=str(user.id),
        ip_address=_client_ip(request),
    )
    db.commit()
    db.refresh(user)

    return SignupResponse(
        user=UserOut.model_validate(user),
        message="Account created. Please verify your email to activate your account.",
        masked_email=mask_email(email),
    )


@router.post("/login", response_model=LoginResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    email = payload.email.lower()
    user = db.query(User).filter(User.email == email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        record_audit(
            db,
            "LOGIN_FAILED",
            actor_email=email,
            entity_type="user",
            ip_address=_client_ip(request),
            metadata={"reason": "bad_credentials"},
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    if user.account_status == AccountStatus.DISABLED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Contact the administrator.",
        )
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Verify your email before signing in.",
        )

    raw_token = create_session(db, user, request, remember=payload.remember_me)
    user.last_login_at = datetime.now(timezone.utc)
    record_audit(
        db,
        "LOGIN_SUCCESS",
        actor_id=user.id,
        actor_email=user.email,
        entity_type="session",
        ip_address=_client_ip(request),
    )
    db.commit()

    response.set_cookie(
        key=SESSION_COOKIE,
        value=raw_token,
        max_age=_session_max_age(payload.remember_me),
        httponly=True,
        samesite="lax",
        secure=False,  # local HTTP development; enable behind TLS in production
        path="/",
    )
    return LoginResponse(
        user=UserOut.model_validate(user),
        message="Signed in successfully.",
    )


def _session_max_age(remember: bool) -> int:
    from app.auth.dependencies import (
        SESSION_TTL_REMEMBER_DAYS,
        SESSION_TTL_DAYS,
    )

    days = SESSION_TTL_REMEMBER_DAYS if remember else SESSION_TTL_DAYS
    return days * 24 * 60 * 60


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    revoke_session(db, request)
    record_audit(
        db,
        "LOGOUT",
        actor_id=user.id,
        actor_email=user.email,
        entity_type="session",
        ip_address=_client_ip(request),
    )
    db.commit()
    response.delete_cookie(key=SESSION_COOKIE, path="/")
    return {"message": "Signed out."}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )
    user.password_hash = hash_password(payload.new_password)
    record_audit(
        db,
        "PASSWORD_CHANGED",
        actor_id=user.id,
        actor_email=user.email,
        entity_type="user",
        entity_id=str(user.id),
        ip_address=_client_ip(request),
    )
    db.commit()
    return {"message": "Password updated successfully."}