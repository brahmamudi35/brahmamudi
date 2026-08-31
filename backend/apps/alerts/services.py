"""Run a saved search against the live profile pool."""

from __future__ import annotations

from django.db.models import Prefetch, Q

from apps.profiles.filters import ProfileFilter
from apps.profiles.models import Profile, ProfilePhoto
from apps.reference.enums import Gender, ProfileStatus


def base_queryset(owner: Profile):
    opposite = Gender.FEMALE if owner.gender == Gender.MALE else Gender.MALE
    return (
        Profile.objects.filter(status=ProfileStatus.ACTIVE, gender=opposite)
        .exclude(pk=owner.pk)
        .select_related("nakshatram", "raasi", "education")
        .prefetch_related(
            Prefetch("photos", queryset=ProfilePhoto.objects.filter(is_approved=True))
        )
    )


def run_search(saved):
    qs = base_queryset(saved.owner)
    data = {k: v for k, v in (saved.filters or {}).items() if v not in (None, "", [])}
    term = str(data.pop("search", "")).strip()
    qs = ProfileFilter(data, queryset=qs).qs
    if term:
        qs = qs.filter(
            Q(first_name__icontains=term)
            | Q(surname__icontains=term)
            | Q(regno__icontains=term)
            | Q(occupation__icontains=term)
        )
    return qs.order_by("-created_at")


def current_max_id(saved) -> int:
    row = run_search(saved).order_by("-id").values_list("id", flat=True).first()
    return int(row or 0)
