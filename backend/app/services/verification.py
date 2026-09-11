"""Email OTP verification and password-reset flows.

OTPs and reset tokens are stored ONLY as SHA-256 hashes; the plaintext
values travel exclusively inside emails (console log in local dev).
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.auth.security import (
    generate_otp,
    generate_reset_token,
    hash_password,
    hash_token,
)
from app.config import settings
from app.models import (
    EmailVerification,
    PasswordResetToken,
    Session as SessionModel,
    User,
)
from app.models.enums import AccountStatus
from app.services import notifications
from app.services.audit import record_audit

OTP_EXPIRY = timedelta(minutes=settings.otp_expiry_minutes)
COOLDOWN = timedelta(seconds=settings.otp_resend_cooldown_seconds)
RESET_EXPIRY = timedelta(hours=settings.password_reset_expiry_hours)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def issue_email_otp(db: Session, user: User) -> dict:
    """Creates/sends an OTP (respecting resend cooldown).

    Returns metadata for the API response (cooldown info when throttled).
    """
    if user.email_verified and user.account_status == AccountStatus.ACTIVE:
        raise ValueError("EMAIL_ALREADY_VERIFIED")

    active = (
        db.query(EmailVerification)
        .filter(
            EmailVerification.user_id == user.id,
            EmailVerification.consumed_at.is_(None),
            EmailVerification.expires_at > _now(),
        )
        .order_by(EmailVerification.created_at.desc())
        .first()
    )
    if active and active.last_sent_at and (_now() - active.last_sent_at) < COOLDOWN:
        remaining = int(
            COOLDOWN.total_seconds()
            - (_now() - active.last_sent_at).total_seconds()
        )
        return {"cooldown_seconds": remaining}

    # Invalidate any outstanding OTPs so only one is live per account.
    db.query(EmailVerification).filter(
        EmailVerification.user_id == user.id,
        EmailVerification.consumed_at.is_(None),
    ).update({"consumed_at": _now()})
    db.flush()

    otp = generate_otp()
    db.add(
        EmailVerification(
            user_id=user.id,
            email=user.email,
            otp_hash=hash_token(otp),
            expires_at=_now() + OTP_EXPIRY,
            last_sent_at=_now(),
        )
    )
    text, html = notifications.build_verify_email_body(
        otp, settings.otp_expiry_minutes
    )
    notifications.send_email(user.email, "Verify your SATYATAG account", text, html)
    db.commit()
    return {}


def verify_email_otp(db: Session, email: str, otp: str) -> dict:
    """Validates an OTP; on success activates the account."""
    email = email.lower()
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise ValueError("INVALID_EMAIL_OR_OTP")
    if user.email_verified and user.account_status == AccountStatus.ACTIVE:
        return {"already_verified": True}

    row = (
        db.query(EmailVerification)
        .filter(
            EmailVerification.user_id == user.id,
            EmailVerification.consumed_at.is_(None),
            EmailVerification.expires_at > _now(),
        )
        .order_by(EmailVerification.created_at.desc())
        .first()
    )
    if row is None:
        raise ValueError("OTP_EXPIRED_NO_LIVE_CODE")

    if row.attempts >= settings.otp_max_attempts:
        raise ValueError("OTP_MAX_ATTEMPTS")

    if hash_token(otp.strip()) != row.otp_hash:
        row.attempts += 1
        db.commit()
        remaining = settings.otp_max_attempts - row.attempts
        raise ValueError(f"OTP_MISMATCH|{remaining}")

    row.consumed_at = _now()
    user.email_verified = True
    user.account_status = AccountStatus.ACTIVE
    record_audit(
        db,
        "EMAIL_VERIFIED",
        actor_id=user.id,
        actor_email=user.email,
        entity_type="user",
        entity_id=str(user.id),
    )
    db.commit()
    return {"already_verified": False}


def issue_password_reset(db: Session, email: str) -> None:
    """Creates and emails a password-reset token (fire-and-forget).

    Always succeeds silently when the account is absent (anti-enumeration).
    """
    user = db.query(User).filter(User.email == email.lower()).first()
    if user is None:
        return

    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.consumed_at.is_(None),
    ).update({"consumed_at": _now()})
    db.flush()

    raw_token = generate_reset_token()
    reset_url = (
        f"{settings.frontend_origin}/reset-password"
        f"?email={user.email}&token={raw_token}"
    )
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=_now() + RESET_EXPIRY,
        )
    )
    text, html = notifications.build_password_reset_body(
        reset_url, settings.password_reset_expiry_hours
    )
    notifications.send_email(user.email, "Reset your SATYATAG password", text, html)
    db.commit()


def reset_password(
    db: Session,
    email: str,
    token: str,
    new_password: str,
    ip_hint: str | None = None,
) -> None:
    email = email.lower()
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise ValueError("INVALID_RESET_LINK")

    row = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.consumed_at.is_(None),
            PasswordResetToken.expires_at > _now(),
        )
        .order_by(PasswordResetToken.created_at.desc())
        .first()
    )
    if row is None or hash_token(token) != row.token_hash:
        raise ValueError("INVALID_RESET_LINK")

    row.consumed_at = _now()
    user.password_hash = hash_password(new_password)
    # Revoke every session so stolen cookies die with the reset.
    db.query(SessionModel).filter(
        SessionModel.user_id == user.id,
        SessionModel.revoked_at.is_(None),
    ).update({"revoked_at": _now()})
    record_audit(
        db,
        "PASSWORD_RESET",
        actor_id=user.id,
        actor_email=user.email,
        entity_type="user",
        entity_id=str(user.id),
        ip_address=ip_hint,
    )
    db.commit()