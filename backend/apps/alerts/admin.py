from django.contrib import admin

from .models import SavedSearch


@admin.register(SavedSearch)
class SavedSearchAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "owner", "alerts_enabled", "last_alerted_at",
                    "created_at")
    list_filter = ("alerts_enabled",)
    search_fields = ("name", "owner__regno")
    autocomplete_fields = ("owner",)
