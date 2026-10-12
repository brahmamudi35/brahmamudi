"""Email one-time codes for signup verification and password reset.

``issue`` mints a fresh 6-digit code (replacing any earlier one for the same
purpose) unless one was sent within the resend cooldown; ``check`` validates a
submitted code, counting failed attempts and burning the code once it is used
or has been guessed at too often.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import EmailOTP

Purpose = EmailOTP.Purpose


class OTPError(Exception):
    pass


def _hash(user, purpose: str, code: str) -> str:
    msg = f"{user.pk}:{purpose}:{code}".encode()
    return hmac.new(settings.SECRET_KEY.encode(), msg, hashlib.sha256).hexdigest()


def issue(user, purpose: str) -> str | None:
    """Return a new code, or None if the last one went out too recently."""
    now = timezone.now()
    cooldown = timedelta(seconds=settings.OTP_RESEND_COOLDOWN_SECONDS)
    if EmailOTP.objects.filter(user=user, purpose=purpose, created_at__gt=now - cooldown).exists():
        return None
    EmailOTP.objects.filter(user=user, purpose=purpose).delete()
    code = f"{secrets.randbelow(10**6):06d}"
    EmailOTP.objects.create(
        user=user,
        purpose=purpose,
        code_hash=_hash(user, purpose, code),
        expires_at=now + timedelta(minutes=settings.OTP_TTL_MINUTES),
    )
    return code


def check(user, purpose: str, code: str, *, consume: bool = True) -> None:
    """Raise OTPError unless ``code`` is the live code for (user, purpose)."""
    otp = (
        EmailOTP.objects.filter(user=user, purpose=purpose, expires_at__gt=timezone.now())
        .order_by("-created_at")
        .first()
        if user is not None
        else None
    )
    if otp is None or otp.attempts >= settings.OTP_MAX_ATTEMPTS:
        raise OTPError("This code is invalid or has expired. Request a new one.")
    if not hmac.compare_digest(otp.code_hash, _hash(user, purpose, (code or "").strip())):
        otp.attempts += 1
        otp.save(update_fields=["attempts"])
        left = settings.OTP_MAX_ATTEMPTS - otp.attempts
        if left <= 0:
            raise OTPError("Too many wrong attempts. Request a new code.")
        raise OTPError(f"That code is incorrect. {left} attempt{'s' if left != 1 else ''} left.")
    if consume:
        otp.delete()
