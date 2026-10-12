from django.contrib import admin

from .models import StaffAction


@admin.register(StaffAction)
class StaffActionAdmin(admin.ModelAdmin):
    """Read-only audit trail of staff member-desk actions."""

    list_display = ("created_at", "actor_email", "action", "profile_regno")
    list_filter = ("action",)
    search_fields = ("actor_email", "profile_regno")
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
