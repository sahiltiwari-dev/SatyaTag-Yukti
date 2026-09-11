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
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    LoginResponse,
    OTPResponse,
    ResetPasswordRequest,
    ResendOtpRequest,
    SignupRequest,
    SignupResponse,
    UserOut,
    VerifyEmailRequest,
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

    # Fire the first OTP so the frontend can proceed straight to /verify-email.
    dev_otp: str | None = None
    from app.services.verification import issue_email_otp

    try:
        otp_result = issue_email_otp(db, user)
        dev_otp = otp_result.get("dev_otp")
    except ValueError:
        # Cooldown table should be empty for a brand-new user; ignore edge case.
        pass

    return SignupResponse(
        user=UserOut.model_validate(user),
        message="Account created. Please verify your email to activate your account.",
        masked_email=mask_email(email),
        dev_otp=dev_otp,
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


# ---------------------------------------------------------------------------
# Email verification (OTP)
# ---------------------------------------------------------------------------


@router.post("/verify-email", status_code=status.HTTP_200_OK)
def verify_email(
    payload: VerifyEmailRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    from app.services.verification import verify_email_otp

    try:
        result = verify_email_otp(db, payload.email, payload.otp)
    except ValueError as exc:
        code = str(exc)
        if code == "OTP_MAX_ATTEMPTS":
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many wrong codes. Request a new one.",
            )
        if code.startswith("OTP_MISMATCH"):
            _, remaining = code.split("|")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Incorrect code. {remaining} attempt(s) remaining.",
            )
        if code == "OTP_EXPIRED_NO_LIVE_CODE":
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="This code has expired. Request a new one.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or code.",
        )

    message = (
        "Email already verified."
        if result.get("already_verified")
        else "Email verified. Your account is now active."
    )
    if not result.get("already_verified"):
        record_audit(
            db,
            "ACCOUNT_ACTIVATED",
            entity_type="user",
            ip_address=_client_ip(request),
        )
        db.commit()
    return {"message": message, "email_verified": True}


@router.post("/resend-otp", response_model=OTPResponse)
def resend_otp(
    payload: ResendOtpRequest,
    db: Session = Depends(get_db),
):
    from app.models import User as UserModel
    from app.services.verification import issue_email_otp

    user = db.query(UserModel).filter(UserModel.email == payload.email.lower()).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found for this email.",
        )
    try:
        result = issue_email_otp(db, user)
    except ValueError as exc:
        if str(exc) == "EMAIL_ALREADY_VERIFIED":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email is already verified.",
            )
        raise

    cooldown = result.get("cooldown_seconds")
    if cooldown:
        return OTPResponse(
            message="A fresh code was recently sent. Try again shortly.",
            masked_email=mask_email(user.email),
            cooldown_seconds=cooldown,
        )
    return OTPResponse(
        message="Verification code sent to your inbox.",
        masked_email=mask_email(user.email),
        cooldown_seconds=settings_otp_cooldown(),
        dev_otp=result.get("dev_otp"),
    )


def settings_otp_cooldown() -> int:
    from app.config import settings

    return settings.otp_resend_cooldown_seconds


# ---------------------------------------------------------------------------
# Password reset
# ---------------------------------------------------------------------------


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    from app.services.verification import issue_password_reset

    dev_reset_url = issue_password_reset(db, payload.email)
    return ForgotPasswordResponse(
        message=(
            "If an account exists for this email, a reset link has been sent."
        ),
        dev_reset_url=dev_reset_url,
    )


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    from app.services.verification import reset_password as reset_service

    try:
        reset_service(
            db,
            payload.email,
            payload.token,
            payload.new_password,
            ip_hint=_client_ip(request),
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link is invalid or has expired.",
        )
    return {"message": "Password reset. You can now sign in with your new password."}