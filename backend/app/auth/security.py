"""Cryptographic primitives: Argon2id passwords, token/OTP hashing."""
import hashlib
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id (secure, salted)."""
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a plaintext password against an Argon2id hash (never raises)."""
    try:
        return _hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError, ValueError):
        return False


def hash_token(token: str) -> str:
    """SHA-256 hash of a raw session/OTP/reset token for DB storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_session_token() -> str:
    """Cryptographically secure random session token (URL-safe, 256 bits)."""
    return secrets.token_urlsafe(32)


def generate_otp() -> str:
    """Cryptographically secure random 6-digit OTP."""
    return f"{secrets.randbelow(1_000_000):06d}"


def generate_reset_token() -> str:
    """Cryptographically secure random password-reset token (URL-safe, 256 bits)."""
    return secrets.token_urlsafe(32)