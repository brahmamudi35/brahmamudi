"""One-click unsubscribe token for the weekly digest email.

A ``TimestampSigner`` blob over the user id. Long-lived (a year) so an old
email's link still works; unsubscribing is idempotent anyway.
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core import signing

User = get_user_model()

_SALT = "digests.unsubscribe"
_MAX_AGE = 365 * 86400


def make_unsubscribe_token(user) -> str:
    return signing.TimestampSigner(salt=_SALT).sign(str(user.pk))


def read_unsubscribe_token(token: str):
    try:
        pk = signing.TimestampSigner(salt=_SALT).unsign(token, max_age=_MAX_AGE)
    except (signing.BadSignature, signing.SignatureExpired):
        return None
    return User.objects.filter(pk=pk).first()
