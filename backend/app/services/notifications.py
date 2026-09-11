"""Email delivery abstraction.

`console` mode logs the message (and the one-time codes) for local
development where no real SMTP/transactional credentials exist. Enable
`resend` mode with RESEND_API_KEY in .env to switch to real delivery —
no application code changes required.
"""
import logging

from app.config import settings

logger = logging.getLogger("satyatag.email")


def send_email(
    to: str,
    subject: str,
    text_body: str,
    html_body: str | None = None,
) -> None:
    if settings.email_mode == "resend":
        # Reserved for a transactional provider. Implemented in a later phase;
        # cribbed against RESEND_API_KEY when credentials are provisioned.
        raise NotImplementedError(
            "resend email mode is not configured yet — set EMAIL_MODE=console"
        )

    logger.info("\n%s\n%s\n%s", "=" * 72, subject, "=" * 72)
    logger.info("To: %s", to)
    logger.info("%s", text_body)
    if html_body:
        logger.info("(HTML body suppressed in console mode)")
    logger.info("%s", "=" * 72)


def build_verify_email_body(otp: str, expiry_minutes: int) -> tuple[str, str]:
    text = (
        "Use this one-time code to verify your SATYATAG account:\n\n"
        f"    {otp}\n\n"
        f"It expires in {expiry_minutes} minutes. "
        "If you did not create a SATYATAG account, you can ignore this email."
    )
    html = (
        f"<p>Use this one-time code to verify your SATYATAG account:</p>"
        f"<h2>{otp}</h2>"
        f"<p>It expires in {expiry_minutes} minutes.</p>"
    )
    return text, html


def build_password_reset_body(
    reset_url: str, expiry_hours: int, ip_hint: str | None = None
) -> tuple[str, str]:
    where = f" from {ip_hint}" if ip_hint else ""
    text = (
        "A password reset was requested for your SATYATAG account.\n\n"
        f"Open this link to choose a new password (valid {expiry_hours} hour(s)):\n\n"
        f"    {reset_url}\n\n"
        f"If you did not request this{where}, you can safely ignore this email."
    )
    html = (
        f"<p>A password reset was requested for your SATYATAG account.</p>"
        f'<p><a href="{reset_url}">Choose a new password</a> '
        f"(valid {expiry_hours} hour(s)).</p>"
    )
    return text, html