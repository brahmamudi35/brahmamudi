from django.conf import settings
from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsEmailVerified(BasePermission):
    """Allow only members who have confirmed their email address.

    Staff are exempt. Turn the whole check off with
    ``REQUIRE_EMAIL_VERIFICATION=false``. Combine with ``IsAuthenticated`` -
    this class only adds the verified requirement.
    """

    message = "Please verify your email address to do this."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        if not getattr(settings, "REQUIRE_EMAIL_VERIFICATION", True):
            return True
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_staff or user.email_verified)
        )
