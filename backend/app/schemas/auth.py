"""Pydantic schemas for the authentication domain."""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import AccountStatus, UserRole


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=120)
    department: Optional[str] = Field(default=None, max_length=120)
    jurisdiction: Optional[str] = Field(default=None, max_length=120)
    employee_id: Optional[str] = Field(default=None, max_length=60)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        if not any(c.isalpha() for c in value):
            raise ValueError("Password must contain at least one letter.")
        if not any(c.isdigit() for c in value):
            raise ValueError("Password must contain at least one number.")
        return value

    @field_validator("full_name")
    @classmethod
    def strip_full_name(cls, value: str) -> str:
        return " ".join(value.split())


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    department: Optional[str] = None
    jurisdiction: Optional[str] = None
    employee_id: Optional[str] = None
    email_verified: bool
    account_status: AccountStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SignupResponse(BaseModel):
    user: UserOut
    message: str
    masked_email: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class LoginResponse(BaseModel):
    user: UserOut
    message: str


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)


class ResendOtpRequest(BaseModel):
    email: EmailStr


class OTPResponse(BaseModel):
    message: str
    masked_email: str
    cooldown_seconds: Optional[int] = None
    dev_otp: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    token: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        if not any(c.isalpha() for c in value):
            raise ValueError("Password must contain at least one letter.")
        if not any(c.isdigit() for c in value):
            raise ValueError("Password must contain at least one number.")
        return value


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        if not any(c.isalpha() for c in value):
            raise ValueError("Password must contain at least one letter.")
        if not any(c.isdigit() for c in value):
            raise ValueError("Password must contain at least one number.")
        return value


def mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if len(local) <= 1:
        return f"{local}***@{domain}"
    return f"{local[0]}{'*' * max(len(local) - 2, 2)}{local[-1]}@{domain}"