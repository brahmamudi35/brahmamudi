"""Assemble one member's weekly digest.

`build_digest` returns None when there is nothing worth mailing about, so the
command can quietly skip inactive members instead of sending an empty email.
"""

from __future__ import annotations

from datetime import datetime

from apps.interests.models import Interest
from apps.profiles import matching
from apps.profiles.models import Profile, ProfileView
from apps.reference.enums import ProfileStatus

_MATCH_LIMIT = 6
_LIST_LIMIT = 5


def build_digest(profile: Profile, *, since: datetime) -> dict | None:
    if profile.status != ProfileStatus.ACTIVE:
        return None

    matches = matching.suggestions(profile, limit=_MATCH_LIMIT)

    pending_qs = Interest.objects.filter(
        receiver=profile, status=Interest.Status.SENT
    ).select_related("sender")
    pending_count = pending_qs.count()
    pending = list(pending_qs.order_by("-created_at")[:_LIST_LIMIT])

    visitor_qs = ProfileView.objects.filter(
        viewed=profile, last_viewed_at__gte=since
    ).select_related("viewer")
    visitor_count = visitor_qs.count()
    visitors = list(visitor_qs.order_by("-last_viewed_at")[:_LIST_LIMIT])

    if not matches and not pending_count and not visitor_count:
        return None

    return {
        "matches": matches,
        "pending_interests": pending,
        "pending_interest_count": pending_count,
        "visitors": visitors,
        "visitor_count": visitor_count,
    }
