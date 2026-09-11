"""Application configuration loaded from environment / .env.

All secrets live server-side only. The frontend never sees DATABASE_URL,
SECRET_KEY, RESEND_API_KEY or EMAIL_FROM.
"""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "SATYATAG API"
    app_version: str = "0.1.0"
    app_env: str = "development"

    # --- Security ---
    secret_key: str = "dev-only-secret-key-change-me"

    # --- PostgreSQL ---
    database_url: str = "postgresql+psycopg://satyatag:satyatag@127.0.0.1:5433/satyatag"

    # --- CORS ---
    frontend_origin: str = "http://localhost:5173"

    # --- Email (Resend) ---
    resend_api_key: str = ""
    # "console" | "resend"
    email_mode: str = "console"
    email_from: str = "SATYATAG <no-reply@satyatag.local>"

    # --- OTP policy ---
    otp_expiry_minutes: int = 10
    otp_max_attempts: int = 5
    otp_resend_cooldown_seconds: int = 60
    password_reset_expiry_hours: int = 1

    # --- Storage ---
    upload_dir: str = "uploads"
    max_upload_bytes: int = 20 * 1024 * 1024

    @property
    def upload_root(self) -> Path:
        path = Path(self.upload_dir)
        if not path.is_absolute():
            path = BACKEND_ROOT / path
        return path.resolve()


settings = Settings()