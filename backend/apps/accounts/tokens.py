"""Signed tokens for email verification and password reset.

- Email verification: a ``TimestampSigner`` blob (expires after N days).
- Password reset: Django's ``default_token_generator`` (auto-invalidates when the
  password or last_login changes) plus a base64 user id. Works for accounts with
  an unusable password too, which matters for migrated legacy members.
"""

from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

User = get_user_model()

_EMAIL_SALT = "accounts.email-verify"


def make_email_token(user) -> str:
    return signing.TimestampSigner(salt=_EMAIL_SALT).sign(str(user.pk))


def read_email_token(token: str):
    max_age = settings.EMAIL_TOKEN_MAX_AGE_DAYS * 86400
    try:
        pk = signing.TimestampSigner(salt=_EMAIL_SALT).unsign(token, max_age=max_age)
    except (signing.BadSignature, signing.SignatureExpired):
        return None
    return User.objects.filter(pk=pk).first()


def make_password_reset_token(user) -> tuple[str, str]:
    return urlsafe_base64_encode(force_bytes(user.pk)), default_token_generator.make_token(user)


def read_password_reset_token(uidb64: str, token: str):
    try:
        pk = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=pk)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return None
    if not default_token_generator.check_token(user, token):
        return None
    return user
