"""Application configuration loaded from environment / .env.

All secrets live server-side only. The frontend never sees DATABASE_URL,
SECRET_KEY, RESEND_API_KEY or EMAIL_FROM.

PRODUCTION SAFETY
-----------------
On startup, validate_production_config() is called (from main.py lifespan).
In APP_ENV=production it refuses to start if:
  - SECRET_KEY equals the default development value
  - SECRET_KEY is shorter than 32 characters
  - EMAIL_MODE=resend but RESEND_API_KEY is empty

Generate a strong key with:
    python -c "import secrets; print(secrets.token_hex(32))"
"""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent

_DEFAULT_SECRET = "dev-only-secret-key-change-me"


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
    secret_key: str = _DEFAULT_SECRET

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

    # --- Rate limiting ---
    # Per-IP limits on sensitive auth endpoints (requests per minute).
    rate_limit_login: str = "10/minute"
    rate_limit_signup: str = "5/minute"
    rate_limit_otp: str = "5/minute"
    rate_limit_password_reset: str = "5/minute"

    @property
    def upload_root(self) -> Path:
        path = Path(self.upload_dir)
        if not path.is_absolute():
            path = BACKEND_ROOT / path
        return path.resolve()

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    def validate_production_config(self) -> None:
        """Raise RuntimeError with a clear message if production config is unsafe.

        Called once at application startup (main.py lifespan). Never logs or
        exposes actual secret values.
        """
        if not self.is_production:
            return  # Development / test: allow defaults for convenience.

        errors: list[str] = []

        if self.secret_key == _DEFAULT_SECRET:
            errors.append(
                "SECRET_KEY is still the default development placeholder. "
                "Generate a strong key: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        elif len(self.secret_key) < 32:
            errors.append(
                f"SECRET_KEY is only {len(self.secret_key)} characters. "
                "Minimum 32 characters required for production."
            )

        if self.email_mode == "resend" and not self.resend_api_key:
            errors.append(
                "EMAIL_MODE=resend but RESEND_API_KEY is not set. "
                "Configure your Resend API key or set EMAIL_MODE=console."
            )

        if not self.frontend_origin or self.frontend_origin == "http://localhost:5173":
            errors.append(
                "FRONTEND_ORIGIN is still pointing to localhost. "
                "Set it to your production frontend URL (e.g. https://yourdomain.com)."
            )

        if errors:
            bullet_list = "\n  - ".join(errors)
            raise RuntimeError(
                "\n\n"
                "=== SATYATAG PRODUCTION STARTUP CHECK FAILED ===\n"
                "The following configuration problems MUST be fixed before "
                "running in APP_ENV=production:\n\n"
                f"  - {bullet_list}\n\n"
                "Fix these issues in your secrets manager or environment, "
                "then restart the application.\n"
                "=================================================\n"
            )


settings = Settings()