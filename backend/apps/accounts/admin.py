from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


class HasProfileFilter(admin.SimpleListFilter):
    title = "profile"
    parameter_name = "has_profile"

    def lookups(self, request, model_admin):
        return [("yes", "Has a member profile"), ("no", "No profile")]

    def queryset(self, request, queryset):
        if self.value() == "yes":
            return queryset.filter(profile__isnull=False)
        if self.value() == "no":
            return queryset.filter(profile__isnull=True)
        return queryset


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("-date_joined",)
    date_hierarchy = "date_joined"
    list_display = (
        "email", "full_name", "phone", "has_profile", "email_verified",
        "is_staff", "must_reset_password", "google_linked", "date_joined",
    )
    list_filter = (
        "is_staff", "is_superuser", "is_active", "email_verified",
        "must_reset_password", HasProfileFilter, "date_joined",
    )
    search_fields = ("email", "full_name", "phone", "legacy_rid")
    readonly_fields = ("last_login", "date_joined", "legacy_rid", "google_sub")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal", {"fields": ("full_name", "phone", "email_verified")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Legacy / linked", {"fields": ("legacy_rid", "must_reset_password", "google_sub")}),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "password1", "password2", "is_staff", "is_superuser")}),
    )

    @admin.display(boolean=True, description="Profile")
    def has_profile(self, obj):
        return hasattr(obj, "profile")

    @admin.display(boolean=True, description="Google")
    def google_linked(self, obj):
        return bool(obj.google_sub)
