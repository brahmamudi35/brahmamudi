"""Domain services for profiles: view tracking and contact-detail unlocking."""

from __future__ import annotations

from dataclasses import dataclass

from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone

from apps.memberships.models import Subscription

from .models import ContactUnlock, Profile, ProfileView


class ContactUnlockError(Exception):
    """Base for unlock failures. `code` maps to an API error string."""

    code = "error"


class SubscriptionRequired(ContactUnlockError):
    code = "subscription_required"


class QuotaExhausted(ContactUnlockError):
    code = "quota_exhausted"


@dataclass
class QuotaStatus:
    plan: str
    limit: int | None          # None = unlimited
    used: int
    remaining: int | None      # None = unlimited

    @property
    def as_dict(self):
        return {
            "plan": self.plan,
            "limit": self.limit,
            "used": self.used,
            "remaining": self.remaining,
            "unlimited": self.limit is None,
        }


def record_view(viewer: Profile, viewed: Profile) -> None:
    """Upsert the (viewer, viewed) ProfileView row. No-op for self-views."""
    if viewer is None or viewer.pk == viewed.pk:
        return
    updated = ProfileView.objects.filter(viewer=viewer, viewed=viewed).update(
        view_count=F("view_count") + 1, last_viewed_at=timezone.now()
    )
    if not updated:
        try:
            ProfileView.objects.create(viewer=viewer, viewed=viewed)
        except IntegrityError:  # race: another request just created it
            ProfileView.objects.filter(viewer=viewer, viewed=viewed).update(
                view_count=F("view_count") + 1, last_viewed_at=timezone.now()
            )


def _best_active_subscription(profile: Profile) -> Subscription | None:
    subs = [
        s for s in profile.subscriptions.select_related("plan")
        .filter(status=Subscription.Status.ACTIVE)
        if s.is_current
    ]
    if not subs:
        return None
    # unlimited plans first, then the largest contact allowance
    return sorted(
        subs,
        key=lambda s: (s.plan.contact_views is None, s.plan.contact_views or 0),
        reverse=True,
    )[0]


def contact_quota(profile: Profile) -> QuotaStatus:
    sub = _best_active_subscription(profile)
    if sub is None:
        return QuotaStatus(plan="free", limit=0, used=0, remaining=0)
    limit = sub.plan.contact_views
    used = ContactUnlock.objects.filter(viewer=profile, subscription=sub).count()
    remaining = None if limit is None else max(limit - used, 0)
    return QuotaStatus(plan=sub.plan.name, limit=limit, used=used, remaining=remaining)


def has_unlocked(viewer: Profile, viewed: Profile) -> bool:
    return ContactUnlock.objects.filter(viewer=viewer, viewed=viewed).exists()


@transaction.atomic
def unlock_contact(viewer: Profile, viewed: Profile) -> tuple[ContactUnlock, QuotaStatus]:
    existing = ContactUnlock.objects.filter(viewer=viewer, viewed=viewed).first()
    if existing:
        return existing, contact_quota(viewer)

    sub = _best_active_subscription(viewer)
    if sub is None or sub.plan.contact_views == 0:
        raise SubscriptionRequired("An active paid membership is required to view contact details.")

    limit = sub.plan.contact_views
    if limit is not None:
        used = (
            ContactUnlock.objects.select_for_update()
            .filter(viewer=viewer, subscription=sub)
            .count()
        )
        if used >= limit:
            raise QuotaExhausted(
                f"You have used all {limit} contact views on the {sub.plan.name} plan."
            )

    try:
        unlock = ContactUnlock.objects.create(viewer=viewer, viewed=viewed, subscription=sub)
    except IntegrityError:
        unlock = ContactUnlock.objects.get(viewer=viewer, viewed=viewed)
    return unlock, contact_quota(viewer)
