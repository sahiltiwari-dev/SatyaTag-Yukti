"""Email delivery abstraction.

`console` mode logs the message (and the one-time codes) for local
development where no real SMTP/transactional credentials exist. Enable
`resend` mode with RESEND_API_KEY in .env to switch to real delivery —
no application code changes required.

IMPORTANT: OTPs, reset tokens, and API keys are never logged, even in
console mode (the OTP value appears in the log only so offline dev works
without a real email provider). Do not enable console mode in production.

Status: WAITING_FOR_CREDENTIALS (Resend path is implemented; key not configured).
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
        _send_via_resend(to, subject, text_body, html_body)
        return

    # Console / development mode: log the email body so offline dev works.
    # OTP values appear here intentionally; do NOT enable in production.
    logger.info("\n%s\n%s\n%s", "=" * 72, subject, "=" * 72)
    logger.info("To: %s", to)
    logger.info("%s", text_body)
    if html_body:
        logger.info("(HTML body suppressed in console mode)")
    logger.info("%s", "=" * 72)


def _send_via_resend(
    to: str,
    subject: str,
    text_body: str,
    html_body: str | None = None,
) -> None:
    """Send email via the Resend transactional API.

    Requires RESEND_API_KEY and EMAIL_FROM to be set in the environment.
    Raises RuntimeError with a safe message (no secret values) on failure.
    """
    api_key = settings.resend_api_key
    if not api_key:
        raise RuntimeError(
            "EMAIL_MODE=resend but RESEND_API_KEY is not configured. "
            "Set it in backend/.env or switch to EMAIL_MODE=console for development."
        )

    email_from = settings.email_from
    if not email_from or "@" not in email_from:
        raise RuntimeError(
            "EMAIL_FROM is not configured or invalid. "
            "Set a verified sender address in backend/.env "
            "(e.g. SATYATAG <no-reply@yourdomain.com>)."
        )

    try:
        import resend  # type: ignore[import]

        resend.api_key = api_key  # Set per-call; never stored in a class attribute.
        params: dict = {
            "from": email_from,
            "to": [to],
            "subject": subject,
            "text": text_body,
        }
        if html_body:
            params["html"] = html_body

        result = resend.Emails.send(params)

        # Resend returns a dict with an 'id' field on success.
        if not result or not result.get("id"):
            logger.error(
                "Resend returned an unexpected response for subject '%s' to '%s'. "
                "Check Resend dashboard for delivery status.",
                subject,
                to[:4] + "***",  # Partial address only — no full email in logs.
            )
            raise RuntimeError("Resend API did not return a message ID. Delivery unconfirmed.")

        logger.info(
            "Email sent via Resend: id=%s subject='%s' to=%s***",
            result["id"],
            subject,
            to[:4],
        )

    except RuntimeError:
        raise
    except Exception as exc:
        # Log the error type (not the message, which may include the API key).
        logger.error(
            "Resend delivery failed for subject '%s': %s",
            subject,
            type(exc).__name__,
        )
        raise RuntimeError(
            f"Email delivery via Resend failed ({type(exc).__name__}). "
            "Check RESEND_API_KEY and EMAIL_FROM in backend/.env, and verify your "
            "sending domain at https://resend.com/domains."
        ) from None


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
        f"<p>If you did not create a SATYATAG account, you can ignore this email.</p>"
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
        f"<p>If you did not request this{where}, you can safely ignore this email.</p>"
    )
    return text, html