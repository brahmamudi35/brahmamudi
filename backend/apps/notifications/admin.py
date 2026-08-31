from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "recipient", "kind", "actor", "read_at", "created_at")
    list_filter = ("kind", ("read_at", admin.EmptyFieldListFilter))
    search_fields = ("recipient__regno", "text")
    autocomplete_fields = ("recipient", "actor")
    date_hierarchy = "created_at"
