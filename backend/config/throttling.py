"""Scoped throttles for abuse-prone endpoints.

Rates live in ``REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]`` (see settings) and are
overridable per environment. Auth (APIView) endpoints set ``throttle_scope`` and
use DRF's built-in ``ScopedRateThrottle``; the viewset actions below need a
class because throttling is chosen per-action in ``get_throttles``.
"""

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class PasswordResetThrottle(AnonRateThrottle):
    scope = "password_reset"


class InterestCreateThrottle(UserRateThrottle):
    scope = "interest_create"


class ContactUnlockThrottle(UserRateThrottle):
    scope = "contact_unlock"


class PoruthamThrottle(UserRateThrottle):
    scope = "porutham"


class PhotoUploadThrottle(UserRateThrottle):
    scope = "photo_upload"
