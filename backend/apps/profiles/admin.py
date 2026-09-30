import csv

from django.contrib import admin
from django.http import HttpResponse
from django.utils import timezone

from .admin_filters import (
    ActivePlanFilter,
    AgeBandFilter,
    HasPhotoFilter,
    ProfileCompleteFilter,
)
from .models import (
    ContactUnlock,
    HoroscopeDocument,
    PartnerPreference,
    Profile,
    ProfilePhoto,
    ProfileView,
    Shortlist,
)


class ProfilePhotoInline(admin.TabularInline):
    model = ProfilePhoto
    extra = 0


class HoroscopeInline(admin.StackedInline):
    model = HoroscopeDocument
    extra = 0


@admin.register(HoroscopeDocument)
class HoroscopeDocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "profile", "is_pdf", "is_approved", "uploaded_at")
    list_filter = ("is_approved", "is_pdf")
    search_fields = ("profile__regno", "profile__first_name", "original_name")
    autocomplete_fields = ("profile",)
    actions = ("approve", "unapprove")

    @admin.action(description="Approve selected")
    def approve(self, request, queryset):
        queryset.update(is_approved=True)

    @admin.action(description="Unapprove selected")
    def unapprove(self, request, queryset):
        queryset.update(is_approved=False)


class PartnerPreferenceInline(admin.StackedInline):
    model = PartnerPreference
    extra = 0


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = (
        "regno", "full_name", "gender", "age_display", "subcaste", "region",
        "status", "is_verified", "plan_display", "email", "created_at",
    )
    list_display_links = ("regno", "full_name")
    list_filter = (
        "status", "is_verified", "gender", "subcaste", "region",
        "marital_status", "food_habit", AgeBandFilter, HasPhotoFilter,
        ActivePlanFilter, ProfileCompleteFilter, "profile_for", "created_at",
    )
    search_fields = (
        "id", "regno", "first_name", "surname", "user__email", "user__phone",
        "contact_phone", "parent_phone", "occupation", "company", "gothram",
        "legacy_rid",
    )
    autocomplete_fields = ("user", "nakshatram", "raasi", "education")
    readonly_fields = ("legacy_rid", "legacy_raw", "created_at", "updated_at")
    inlines = [ProfilePhotoInline, HoroscopeInline, PartnerPreferenceInline]
    list_select_related = ("user", "nakshatram", "raasi", "education")
    date_hierarchy = "created_at"
    list_per_page = 50
    actions = ("mark_verified", "mark_unverified", "activate", "suspend",
               "export_csv")

    @admin.display(description="Name")
    def full_name(self, obj):
        return obj.full_name or "—"

    @admin.display(description="Age")
    def age_display(self, obj):
        return obj.age if obj.age is not None else "—"

    @admin.display(description="Email")
    def email(self, obj):
        return obj.user.email

    @admin.display(description="Plan")
    def plan_display(self, obj):
        sub = next(
            (s for s in obj.subscriptions.all()
             if s.status == "active" and s.is_current), None
        )
        return sub.plan.name if sub else "Free"

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related("subscriptions__plan")

    @admin.action(description="Mark selected profiles as verified")
    def mark_verified(self, request, queryset):
        queryset.update(is_verified=True)

    @admin.action(description="Remove verified badge")
    def mark_unverified(self, request, queryset):
        queryset.update(is_verified=False)

    @admin.action(description="Set status: active")
    def activate(self, request, queryset):
        queryset.update(status="active")

    @admin.action(description="Set status: suspended")
    def suspend(self, request, queryset):
        queryset.update(status="suspended")

    @admin.action(description="Export selected to CSV")
    def export_csv(self, request, queryset):
        cols = [
            "regno", "first_name", "surname", "gender", "age", "date_of_birth",
            "marital_status", "subcaste", "gothram", "region", "country_living",
            "status", "is_verified", "occupation", "email", "phone",
            "contact_phone", "plan", "created_at",
        ]
        resp = HttpResponse(content_type="text/csv")
        resp["Content-Disposition"] = (
            f'attachment; filename="members-{timezone.now():%Y%m%d-%H%M}.csv"'
        )
        writer = csv.writer(resp)
        writer.writerow(cols)
        for p in queryset.select_related("user").prefetch_related("subscriptions__plan"):
            writer.writerow([
                p.regno, p.first_name, p.surname, p.get_gender_display(), p.age,
                p.date_of_birth, p.marital_status, p.subcaste, p.gothram, p.region,
                p.country_living, p.status, p.is_verified, p.occupation,
                p.user.email, p.user.phone, p.contact_phone,
                self.plan_display(p), p.created_at.isoformat(),
            ])
        return resp


@admin.register(PartnerPreference)
class PartnerPreferenceAdmin(admin.ModelAdmin):
    list_display = ("profile", "age_min", "age_max", "height_min_cm", "height_max_cm")
    search_fields = ("profile__regno", "profile__first_name")
    autocomplete_fields = ("profile",)


@admin.register(Shortlist)
class ShortlistAdmin(admin.ModelAdmin):
    list_display = ("owner", "target", "created_at")
    search_fields = ("owner__regno", "target__regno")


@admin.register(ContactUnlock)
class ContactUnlockAdmin(admin.ModelAdmin):
    list_display = ("viewer", "viewed", "subscription", "created_at")
    search_fields = ("viewer__regno", "viewed__regno")
    autocomplete_fields = ("viewer", "viewed", "subscription")
    date_hierarchy = "created_at"


@admin.register(ProfilePhoto)
class ProfilePhotoAdmin(admin.ModelAdmin):
    list_display = ("id", "profile", "is_primary", "is_approved", "uploaded_at")
    list_filter = ("is_approved", "is_primary")
    search_fields = ("profile__regno", "profile__first_name")
    actions = ("approve", "unapprove")

    @admin.action(description="Approve selected photos")
    def approve(self, request, queryset):
        queryset.update(is_approved=True)

    @admin.action(description="Unapprove selected photos")
    def unapprove(self, request, queryset):
        queryset.update(is_approved=False)


@admin.register(ProfileView)
class ProfileViewAdmin(admin.ModelAdmin):
    list_display = ("viewer", "viewed", "view_count", "last_viewed_at")
    search_fields = ("viewer__regno", "viewed__regno")
    date_hierarchy = "last_viewed_at"
