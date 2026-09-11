"""Authentication dependencies: session cookie → current user."""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.security import hash_token
from app.database import get_db
from app.models.activity import AuditEvent  # noqa: F401  (registered)
from app.models.enums import AccountStatus, UserRole
from app.models.user import Session as SessionModel
from app.models.user import User

SESSION_COOKIE = "satyatag_session"
SESSION_TTL_REMEMBER_DAYS = 30
SESSION_TTL_DAYS = 7


def _session_ttl(remember: bool) -> timedelta:
    return timedelta(
        days=SESSION_TTL_REMEMBER_DAYS if remember else SESSION_TTL_DAYS
    )


def create_session(
    db: Session,
    user: User,
    request: Request,
    remember: bool = False,
) -> str:
    """Creates a persistent server-side session; returns the raw cookie token.

    Only the SHA-256 token hash is stored in PostgreSQL. The raw token is
    delivered to the browser exclusively via an HttpOnly cookie.
    """
    from app.auth.security import generate_session_token

    raw_token = generate_session_token()
    session = SessionModel(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + _session_ttl(remember),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent", "")[:255],
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return raw_token


def revoke_session(db: Session, request: Request) -> None:
    raw = request.cookies.get(SESSION_COOKIE)
    if not raw:
        return
    session = (
        db.query(SessionModel)
        .filter(
            SessionModel.token_hash == hash_token(raw),
            SessionModel.revoked_at.is_(None),
        )
        .first()
    )
    if session:
        session.revoked_at = datetime.now(timezone.utc)
        db.commit()


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """Resolves the authenticated user from the HttpOnly session cookie."""
    raw = request.cookies.get(SESSION_COOKIE)
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        )
    session = (
        db.query(SessionModel)
        .filter(
            SessionModel.token_hash == hash_token(raw),
            SessionModel.revoked_at.is_(None),
            SessionModel.expires_at > func.now(),
        )
        .first()
    )
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please sign in again.",
        )
    user = db.get(User, session.user_id)
    if user is None or user.account_status != AccountStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account unavailable.",
        )
    return user


def require_roles(*roles: UserRole):
    """Dependency factory enforcing one of the required roles server-side."""
    allowed = set(roles)

    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient privileges.",
            )
        return user

    return dependency