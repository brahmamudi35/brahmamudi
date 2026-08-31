"""Custom admin list filters for the member directory."""

from datetime import date

from django.contrib import admin
from django.db.models import Exists, OuterRef, Q


def _years_ago(years: int) -> date:
    today = date.today()
    try:
        return today.replace(year=today.year - years)
    except ValueError:  # Feb 29
        return today.replace(year=today.year - years, day=28)


class AgeBandFilter(admin.SimpleListFilter):
    title = "age"
    parameter_name = "age_band"
    BANDS = [
        ("18-24", 18, 24), ("25-29", 25, 29), ("30-34", 30, 34),
        ("35-39", 35, 39), ("40-49", 40, 49), ("50+", 50, 120),
    ]

    def lookups(self, request, model_admin):
        return [(slug, slug) for slug, _, _ in self.BANDS]

    def queryset(self, request, queryset):
        for slug, lo, hi in self.BANDS:
            if self.value() == slug:
                return queryset.filter(
                    date_of_birth__lte=_years_ago(lo),
                    date_of_birth__gte=_years_ago(hi + 1),
                )
        return queryset


class HasPhotoFilter(admin.SimpleListFilter):
    title = "photo"
    parameter_name = "has_photo"

    def lookups(self, request, model_admin):
        return [("yes", "Has an approved photo"), ("no", "No approved photo"),
                ("pending", "Has a photo awaiting review")]

    def queryset(self, request, queryset):
        from .models import ProfilePhoto

        approved = ProfilePhoto.objects.filter(profile=OuterRef("pk"), is_approved=True)
        pending = ProfilePhoto.objects.filter(profile=OuterRef("pk"), is_approved=False)
        if self.value() == "yes":
            return queryset.filter(Exists(approved))
        if self.value() == "no":
            return queryset.filter(~Exists(approved))
        if self.value() == "pending":
            return queryset.filter(Exists(pending))
        return queryset


class ActivePlanFilter(admin.SimpleListFilter):
    title = "active plan"
    parameter_name = "plan"

    def lookups(self, request, model_admin):
        from apps.memberships.models import MembershipPlan

        return [(p.slug, p.name) for p in MembershipPlan.objects.all()] + [
            ("none", "No active paid plan")
        ]

    def queryset(self, request, queryset):
        from apps.memberships.models import Subscription

        val = self.value()
        if not val:
            return queryset
        active = Subscription.objects.filter(
            profile=OuterRef("pk"), status=Subscription.Status.ACTIVE
        ).filter(Q(expires_on__isnull=True) | Q(expires_on__gte=date.today()))
        if val == "none":
            paid = active.filter(plan__price_inr__gt=0)
            return queryset.filter(~Exists(paid))
        return queryset.filter(Exists(active.filter(plan__slug=val)))


class ProfileCompleteFilter(admin.SimpleListFilter):
    title = "horoscope on file"
    parameter_name = "horoscope"

    def lookups(self, request, model_admin):
        return [("yes", "Nakshatram + Raasi set"), ("no", "Missing")]

    def queryset(self, request, queryset):
        cond = Q(nakshatram__isnull=False) & Q(raasi__isnull=False)
        if self.value() == "yes":
            return queryset.filter(cond)
        if self.value() == "no":
            return queryset.exclude(cond)
        return queryset
