"""Domain services for profiles: view tracking, contact-detail unlocking,
profile completeness."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from typing import Callable

from django.db import IntegrityError, transaction
from django.db.models import BigIntegerField, F, Max
from django.db.models.functions import Cast
from django.utils import timezone

from apps.memberships.models import Subscription

from .models import ContactUnlock, Profile, ProfileView

# New profiles are numbered 6220, 6221, ... continuing above the legacy
# site's numbers (whose regnos start with the old rid, up to ~6198).
FIRST_REGNO = 6220


def next_regno() -> str:
    """The next free profile number: one past the highest all-digit regno."""
    highest = (
        Profile.objects.filter(regno__regex=r"^[0-9]+$")
        .annotate(n=Cast("regno", BigIntegerField()))
        .aggregate(m=Max("n"))["m"]
    )
    return str(max(highest or 0, FIRST_REGNO - 1) + 1)


def save_with_regno(save: Callable[[str], Profile], attempts: int = 5) -> Profile:
    """Run ``save(regno)`` with the next profile number, retrying if another
    profile claimed the same number at the same moment."""
    for attempt in range(attempts):
        try:
            with transaction.atomic():
                return save(next_regno())
        except IntegrityError:
            if attempt == attempts - 1:
                raise
    raise AssertionError("unreachable")


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

    from apps.notifications.services import notify

    notify(
        viewed, "profile_view", actor=viewer,
        text=f"{viewer.first_name or 'Someone'} viewed your profile",
        url=f"/profiles/{viewer.pk}", dedupe_hours=24,
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


# --- profile completeness -------------------------------------------------

# (key, label, onboarding step index, weight, required attribute names)
# A section with no attrs is scored by a custom rule in `_section_ratio`.
_COMPLETENESS_SECTIONS = [
    ("about", "Basic details", 0, 15,
     ["first_name", "gender", "date_of_birth", "marital_status"]),
    ("appearance", "Appearance", 1, 10, ["height_cm", "complexion", "food_habit"]),
    ("horoscope", "Community & horoscope", 2, 15,
     ["subcaste", "gothram", "nakshatram_id", "raasi_id"]),
    ("career", "Education & career", 3, 15, ["education_detail", "occupation"]),
    ("location", "Location", 4, 10, ["country_living", "region"]),
    ("family", "Family", 5, 10,
     ["father_name", "mother_name", "family_background"]),
    ("about_text", "About you", 5, 5, ["about"]),
    ("preference", "Partner preference", 6, 5, []),
    ("photos", "Photos", 7, 15, []),
]


def _filled(profile: Profile, attrs: Iterable[str]) -> int:
    return sum(1 for a in attrs if getattr(profile, a, None))


def _section_ratio(profile: Profile, key: str, attrs: list[str]) -> float:
    if key == "photos":
        return 1.0 if profile.photos.filter(is_approved=True).exists() else 0.0
    if key == "preference":
        pref = getattr(profile, "partner_preference", None)
        if pref is None:
            return 0.0
        signals = [
            pref.age_min or pref.age_max,
            pref.height_min_cm or pref.height_max_cm,
            pref.subcastes, pref.marital_status, pref.regions,
            pref.countries, pref.education_categories, pref.food_habits,
        ]
        return 1.0 if any(signals) else 0.0
    return _filled(profile, attrs) / len(attrs) if attrs else 0.0


def completeness(profile: Profile) -> dict:
    sections, percent = [], 0.0
    for key, label, step, weight, attrs in _COMPLETENESS_SECTIONS:
        ratio = _section_ratio(profile, key, attrs)
        percent += weight * ratio
        sections.append({
            "key": key,
            "label": label,
            "step": step,
            "weight": weight,
            "ratio": round(ratio, 2),
            "done": ratio >= 0.999,
        })
    percent = round(percent)
    return {
        "percent": percent,
        "complete": percent >= 100,
        "next": next((s for s in sections if not s["done"]), None),
        "missing": [s for s in sections if not s["done"]],
        "sections": sections,
    }


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
