"""Interest business rules: daily send quota from the sender's plan."""

from __future__ import annotations

from django.utils import timezone

from apps.memberships.models import MembershipPlan, Subscription

from .models import Interest

FREE_DAILY_LIMIT = 5


def daily_interest_limit(profile) -> int | None:
    """Interests the profile may send per day. None = unlimited."""
    sub = (
        profile.subscriptions.select_related("plan")
        .filter(status=Subscription.Status.ACTIVE)
        .order_by("-plan__sort_order")
        .first()
    )
    if sub and sub.is_current:
        return sub.plan.interests_per_day
    free = MembershipPlan.objects.filter(slug="free").first()
    return free.interests_per_day if free else FREE_DAILY_LIMIT


def interests_sent_today(profile) -> int:
    start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    return Interest.objects.filter(sender=profile, created_at__gte=start).count()


def remaining_interests_today(profile) -> int | None:
    limit = daily_interest_limit(profile)
    if limit is None:
        return None
    return max(limit - interests_sent_today(profile), 0)
