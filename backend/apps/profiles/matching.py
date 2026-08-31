"""Ranked partner suggestions for a member.

Combines how well a candidate fits the member's stated ``PartnerPreference``
with the ten-porutham compatibility score, then returns the best few. Candidates
already shortlisted or in an interest thread with the member are left out - this
is for discovering someone new.
"""

from __future__ import annotations

from datetime import date

from django.db.models import Prefetch

from apps.reference.enums import Gender, ProfileStatus

from . import porutham
from .models import Profile, ProfilePhoto

_POOL = 80  # candidates scored in Python before taking the top `limit`

_VERDICT_RATIO = {
    "excellent": 1.0,
    "acceptable": 0.65,
    "poor": 0.35,
    "not_recommended": 0.0,
    "unknown": 0.5,
}


def _dob_bound(age: int) -> date:
    today = date.today()
    try:
        return today.replace(year=today.year - age)
    except ValueError:  # Feb 29
        return today.replace(year=today.year - age, day=28)


# Legacy "no preference" sentinels that must not count as a real criterion.
_ANY = {"", "any", "any region", "anyregion", "doesn't matter", "does not matter",
        "no preference", "all", "open"}


def _real(values) -> list:
    return [v for v in (values or []) if str(v).strip().lower() not in _ANY]


def _pref_ratio(pref, cand) -> tuple[float, list[str]]:
    """Fraction of the member's stated preferences the candidate meets, with a
    short human reason for each hit."""
    if pref is None:
        return 0.5, []

    checks: list[tuple[bool, bool, str]] = []  # (specified, met, reason)

    age = cand.age
    lo, hi = pref.age_min, pref.age_max
    if lo or hi:
        met = age is not None and (not lo or age >= lo) and (not hi or age <= hi)
        checks.append((True, met, "In your age range"))

    h = cand.height_cm
    hlo, hhi = pref.height_min_cm, pref.height_max_cm
    if hlo or hhi:
        met = h is not None and (not hlo or h >= hlo) and (not hhi or h <= hhi)
        checks.append((True, met, "In your height range"))

    subcastes = _real(pref.subcastes)
    marital = _real(pref.marital_status)
    regions = _real(pref.regions)
    foods = _real(pref.food_habits)
    edu = _real(pref.education_categories)
    countries = _real(pref.countries)

    for values, met, reason in (
        (subcastes, cand.subcaste in subcastes, "Same sub-caste"),
        (marital, cand.marital_status in marital, "Marital status matches"),
        (regions, cand.region in regions, "Preferred region"),
        (foods, cand.food_habit in foods, "Food habits match"),
        (edu, cand.education and cand.education.category in edu,
         "Education level matches"),
    ):
        if values:
            checks.append((True, bool(met), reason))

    if countries:
        met = any(c.lower() in (cand.country_living or "").lower() for c in countries)
        checks.append((True, met, "Living where you prefer"))

    specified = [c for c in checks if c[0]]
    if not specified:
        return 0.5, []
    hits = sum(1 for _, met, _ in specified if met)
    reasons = [reason for _, met, reason in specified if met]
    return hits / len(specified), reasons


def suggestions(viewer: Profile, limit: int = 12) -> list[dict]:
    if not viewer.gender:
        return []
    opposite = Gender.FEMALE if viewer.gender == Gender.MALE else Gender.MALE

    qs = (
        Profile.objects.filter(status=ProfileStatus.ACTIVE, gender=opposite)
        .exclude(pk=viewer.pk)
        .exclude(shortlisted_by__owner=viewer)
        .exclude(received_interests__sender=viewer)
        .exclude(sent_interests__receiver=viewer)
        .select_related("nakshatram", "raasi", "education")
        .prefetch_related(
            Prefetch("photos", queryset=ProfilePhoto.objects.filter(is_approved=True))
        )
        .distinct()
    )

    pref = getattr(viewer, "partner_preference", None)
    if pref and pref.subcastes:
        qs = qs.filter(subcaste__in=pref.subcastes)
    if pref and (pref.age_min or pref.age_max):
        if pref.age_max:
            qs = qs.filter(date_of_birth__gte=_dob_bound(pref.age_max + 1))
        if pref.age_min:
            qs = qs.filter(date_of_birth__lte=_dob_bound(pref.age_min))

    candidates = list(qs.order_by("-created_at")[:_POOL])

    scored: list[dict] = []
    for cand in candidates:
        pratio, reasons = _pref_ratio(pref, cand)
        bride, groom = (
            (viewer, cand) if viewer.gender == Gender.FEMALE else (cand, viewer)
        )
        por = porutham.compute(bride, groom)
        if por["graded"] > 0 and por["verdict"] == "not_recommended":
            continue
        por_ratio = _VERDICT_RATIO.get(por["verdict"], 0.5)
        score = round(100 * (0.6 * pratio + 0.4 * por_ratio))
        if por["verdict"] not in ("unknown",):
            reasons = [*reasons, f"Porutham: {por['verdict'].replace('_', ' ')}"]
        scored.append({
            "profile": cand,
            "score": score,
            "reasons": reasons[:3],
            "porutham_verdict": por["verdict"],
            "porutham_percent": por["percent"],
        })

    scored.sort(key=lambda s: (s["score"], s["profile"].created_at), reverse=True)
    return scored[:limit]
