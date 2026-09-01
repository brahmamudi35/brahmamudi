from datetime import date

import django_filters as filters
from django.db.models import Exists, OuterRef, Q

from apps.payments.models import PaymentTransaction
from apps.profiles.models import Profile, ProfilePhoto
from apps.reference import enums
from apps.reference.models import EducationLevel


def _years_ago(years: int) -> date:
    today = date.today()
    try:
        return today.replace(year=today.year - years)
    except ValueError:
        return today.replace(year=today.year - years, day=28)


class ModerationProfileFilter(filters.FilterSet):
    gender = filters.ChoiceFilter(choices=enums.Gender.choices)
    subcaste = filters.MultipleChoiceFilter(choices=enums.SubCaste.choices)
    region = filters.MultipleChoiceFilter(choices=enums.Region.choices)
    marital_status = filters.MultipleChoiceFilter(choices=enums.MaritalStatus.choices)
    status = filters.MultipleChoiceFilter(choices=enums.ProfileStatus.choices)
    is_verified = filters.BooleanFilter()

    age_min = filters.NumberFilter(method="f_age_min")
    age_max = filters.NumberFilter(method="f_age_max")
    has_photo = filters.ChoiceFilter(
        method="f_has_photo",
        choices=[("yes", "yes"), ("no", "no"), ("pending", "pending")],
    )
    plan = filters.CharFilter(method="f_plan")
    joined_after = filters.DateFilter(field_name="created_at", lookup_expr="date__gte")

    education = filters.MultipleChoiceFilter(
        field_name="education__category", choices=EducationLevel.CATEGORY_CHOICES
    )
    designation = filters.CharFilter(lookup_expr="icontains")
    work_location = filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Profile
        fields: list = []

    def f_age_min(self, qs, name, value):
        return qs.filter(date_of_birth__lte=_years_ago(int(value)))

    def f_age_max(self, qs, name, value):
        return qs.filter(date_of_birth__gte=_years_ago(int(value) + 1))

    def f_has_photo(self, qs, name, value):
        approved = ProfilePhoto.objects.filter(profile=OuterRef("pk"), is_approved=True)
        pending = ProfilePhoto.objects.filter(profile=OuterRef("pk"), is_approved=False)
        if value == "yes":
            return qs.filter(Exists(approved))
        if value == "no":
            return qs.filter(~Exists(approved))
        if value == "pending":
            return qs.filter(Exists(pending))
        return qs

    def f_plan(self, qs, name, value):
        from apps.memberships.models import Subscription

        active = Subscription.objects.filter(
            profile=OuterRef("pk"), status=Subscription.Status.ACTIVE
        ).filter(Q(expires_on__isnull=True) | Q(expires_on__gte=date.today()))
        if value == "none":
            return qs.filter(~Exists(active.filter(plan__price_inr__gt=0)))
        return qs.filter(Exists(active.filter(plan__slug=value)))


class ModerationPaymentFilter(filters.FilterSet):
    status = filters.MultipleChoiceFilter(
        choices=PaymentTransaction.Status.choices
    )
    environment = filters.CharFilter()
    plan = filters.CharFilter(field_name="plan__slug")
    is_legacy = filters.BooleanFilter()
    created_after = filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    created_before = filters.DateFilter(field_name="created_at", lookup_expr="date__lte")
    profile = filters.NumberFilter(field_name="profile_id")

    class Meta:
        model = PaymentTransaction
        fields: list = []
