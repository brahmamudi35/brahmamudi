from django.contrib import admin

from .models import PaymentTransaction, PayUCredential


@admin.register(PayUCredential)
class PayUCredentialAdmin(admin.ModelAdmin):
    list_display = ("environment", "merchant_key", "is_active", "updated_at")


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ("txnid", "profile", "plan", "amount", "status", "environment", "created_at")
    list_filter = ("status", "environment", "is_legacy")
    search_fields = ("txnid", "mihpayid", "email", "phone", "profile__regno")
    readonly_fields = ("raw_request", "raw_response", "created_at", "updated_at")
    autocomplete_fields = ("profile", "plan")
    date_hierarchy = "created_at"
