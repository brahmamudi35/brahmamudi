from django.contrib import admin

from .models import Interest, InterestTemplate


@admin.register(InterestTemplate)
class InterestTemplateAdmin(admin.ModelAdmin):
    list_display = ("id", "text", "is_active", "sort_order")
    list_editable = ("is_active", "sort_order")
    search_fields = ("text",)


@admin.register(Interest)
class InterestAdmin(admin.ModelAdmin):
    list_display = ("id", "sender", "receiver", "status", "created_on", "responded_at")
    list_filter = ("status",)
    search_fields = ("sender__regno", "receiver__regno")
    autocomplete_fields = ("sender", "receiver", "template")
    date_hierarchy = "created_at"
