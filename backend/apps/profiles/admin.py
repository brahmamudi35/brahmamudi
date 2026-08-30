from django.contrib import admin

from .models import (
    ContactUnlock,
    PartnerPreference,
    Profile,
    ProfilePhoto,
    ProfileView,
    Shortlist,
)


class ProfilePhotoInline(admin.TabularInline):
    model = ProfilePhoto
    extra = 0


class PartnerPreferenceInline(admin.StackedInline):
    model = PartnerPreference
    extra = 0


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("regno", "first_name", "surname", "gender", "subcaste", "status", "is_verified", "expires_on")
    list_filter = ("status", "gender", "subcaste", "region", "is_verified")
    search_fields = ("regno", "first_name", "surname", "user__email", "gothram", "legacy_rid")
    autocomplete_fields = ("user", "nakshatram", "raasi", "education")
    readonly_fields = ("legacy_rid", "legacy_raw", "created_at", "updated_at")
    inlines = [ProfilePhotoInline, PartnerPreferenceInline]
    list_select_related = ("user",)


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


@admin.register(ProfileView)
class ProfileViewAdmin(admin.ModelAdmin):
    list_display = ("viewer", "viewed", "view_count", "last_viewed_at")
    search_fields = ("viewer__regno", "viewed__regno")
    date_hierarchy = "last_viewed_at"
