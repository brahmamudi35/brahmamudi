from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("email",)
    list_display = ("email", "full_name", "phone", "is_staff", "must_reset_password", "date_joined")
    list_filter = ("is_staff", "is_superuser", "is_active", "must_reset_password")
    search_fields = ("email", "full_name", "phone", "legacy_rid")
    readonly_fields = ("last_login", "date_joined", "legacy_rid")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal", {"fields": ("full_name", "phone")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Legacy", {"fields": ("legacy_rid", "must_reset_password")}),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "password1", "password2", "is_staff", "is_superuser")}),
    )
