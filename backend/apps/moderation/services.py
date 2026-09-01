"""Staff desk actions that change member state (memberships, mostly).

These mirror what the payment flow does in apps.payments.services, but are
initiated by a staff member rather than a gateway callback — e.g. comping a plan
for someone who paid offline.
"""

from __future__ import annotations

from datetime import date, timedelta

from django.db import transaction

from apps.memberships.models import MembershipPlan, Subscription
from apps.profiles.models import Profile


@transaction.atomic
def grant_plan(profile: Profile, plan: MembershipPlan, *, months: int | None = None,
               actor=None) -> Subscription:
    """Give `profile` an active subscription to `plan`, superseding any current
    one, and make the profile live. `months` overrides the plan's own duration."""
    start = date.today()
    if months is None:
        expires = plan.expiry_from(start)
    elif months <= 0:
        expires = None  # no expiry
    else:
        expires = start + timedelta(days=30 * months)

    Subscription.objects.filter(
        profile=profile, status=Subscription.Status.ACTIVE
    ).update(status=Subscription.Status.EXPIRED)

    sub = Subscription.objects.create(
        profile=profile,
        plan=plan,
        status=Subscription.Status.ACTIVE,
        started_on=start,
        expires_on=expires,
    )

    profile.status = "active"
    if expires:
        profile.expires_on = expires
    profile.save(update_fields=["status", "expires_on"])

    from apps.notifications.services import notify

    notify(
        profile, "subscription_activated",
        text=f"Your {plan.name} membership is active",
        url="/membership", data={"plan": plan.slug, "by": "staff"},
    )
    return sub


def revoke_subscription(sub: Subscription) -> Subscription:
    sub.status = Subscription.Status.CANCELLED
    sub.save(update_fields=["status", "updated_at"])
    return sub
