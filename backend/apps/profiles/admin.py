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
    actions = ("mark_verified", "mark_unverified", "activate", "suspend")

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
