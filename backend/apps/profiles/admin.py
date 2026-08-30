from django.contrib import admin

from .models import PartnerPreference, Profile, ProfilePhoto, Shortlist


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
