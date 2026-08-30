"""Google Sign-In: verify a Google ID token and resolve it to a local User."""

from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

User = get_user_model()

_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


class GoogleAuthError(Exception):
    pass


def verify_google_credential(credential: str) -> dict:
    """Validate the ID token's signature, audience and issuer; return its claims."""
    if not settings.GOOGLE_OAUTH_CLIENT_ID:
        raise GoogleAuthError("Google Sign-In is not configured.")
    try:
        claims = google_id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.GOOGLE_OAUTH_CLIENT_ID,
        )
    except ValueError as exc:
        raise GoogleAuthError("Could not verify the Google token.") from exc

    if claims.get("iss") not in _ISSUERS:
        raise GoogleAuthError("Unexpected token issuer.")
    if not claims.get("email"):
        raise GoogleAuthError("Google did not return an email address.")
    if not claims.get("email_verified"):
        raise GoogleAuthError("Your Google email address is not verified.")
    return claims


def get_or_create_user_from_google(claims: dict) -> tuple[User, bool]:
    """Return (user, created). Links by google sub first, then by verified email."""
    sub = claims["sub"]
    email = claims["email"].lower()
    name = claims.get("name") or ""

    user = User.objects.filter(google_sub=sub).first()
    if user:
        return user, False

    user = User.objects.filter(email=email).first()
    if user:
        # Link the existing account. Google has proven control of this inbox.
        user.google_sub = sub
        user.email_verified = True
        if not user.full_name and name:
            user.full_name = name
        user.save(update_fields=["google_sub", "email_verified", "full_name"])
        return user, False

    user = User(
        email=email,
        full_name=name,
        google_sub=sub,
        email_verified=True,
    )
    user.set_unusable_password()
    user.save()
    return user, True
