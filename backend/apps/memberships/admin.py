from django.contrib import admin

from .models import MembershipPlan, Subscription


@admin.register(MembershipPlan)
class MembershipPlanAdmin(admin.ModelAdmin):
    list_display = ("name", "price_inr", "duration_months", "contact_views", "is_active", "sort_order")
    list_editable = ("is_active", "sort_order")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("profile", "plan", "status", "started_on", "expires_on", "is_legacy")
    list_filter = ("status", "plan", "is_legacy")
    search_fields = ("profile__regno", "profile__first_name")
    autocomplete_fields = ("profile", "payment")
