import logging

from django.conf import settings
from django.core.mail import send_mail
from django.utils.html import escape

from . import otp

log = logging.getLogger(__name__)


def _code_html(intro: str, code: str, outro: str) -> str:
    return (
        '<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#222">'
        f'<p>{escape(intro)}</p>'
        '<p style="font-size:32px;font-weight:bold;letter-spacing:8px;'
        'background:#fdf2f4;color:#9f1239;padding:16px;text-align:center;border-radius:8px">'
        f"{code}</p>"
        f'<p style="color:#555;font-size:14px">{escape(outro)}</p>'
        '<p style="color:#999;font-size:12px">— brahmamudi</p></div>'
    )


def _send_code(user, subject: str, intro: str, code: str) -> None:
    outro = (
        f"This code expires in {settings.OTP_TTL_MINUTES} minutes. "
        "Never share it with anyone — brahmamudi staff will never ask for it. "
        "If you didn't request it, you can ignore this email."
    )
    send_mail(
        subject=subject,
        message=f"{intro}\n\n    {code}\n\n{outro}",
        html_message=_code_html(intro, code, outro),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_verification_email(user) -> bool:
    """Email a signup verification code. False if one was sent too recently."""
    code = otp.issue(user, otp.Purpose.VERIFY_EMAIL)
    if code is None:
        return False
    _send_code(
        user,
        subject=f"{code} is your brahmamudi verification code",
        intro="Welcome to brahmamudi. Enter this code to verify your email address:",
        code=code,
    )
    return True


def send_password_reset_email(user) -> bool:
    """Email a password-reset code. False if one was sent too recently."""
    code = otp.issue(user, otp.Purpose.PASSWORD_RESET)
    if code is None:
        return False
    _send_code(
        user,
        subject=f"{code} is your brahmamudi password reset code",
        intro="We received a request to reset your brahmamudi password. Enter this code to continue:",
        code=code,
    )
    return True


def send_verification_email_safely(user) -> None:
    """Best-effort variant for signup: a mail outage must not fail registration."""
    try:
        send_verification_email(user)
    except Exception:  # noqa: BLE001
        log.exception("verification email failed for user %s", user.pk)
