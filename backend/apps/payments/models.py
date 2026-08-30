import uuid

from django.db import models


def new_txnid() -> str:
    return uuid.uuid4().hex


class PayUCredential(models.Model):
    class Environment(models.TextChoices):
        STAGING = "staging", "Staging"
        PRODUCTION = "production", "Production"

    environment = models.CharField(
        max_length=12, choices=Environment.choices, unique=True
    )
    merchant_key = models.CharField(max_length=64)
    merchant_salt = models.CharField(max_length=128)
    is_active = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payu_credential"

    def __str__(self):
        return f"PayU[{self.environment}]"


class PaymentTransaction(models.Model):
    class Status(models.TextChoices):
        INITIATED = "initiated", "Initiated"
        PENDING = "pending", "Pending"
        SUCCESS = "success", "Success"
        FAILURE = "failure", "Failure"
        CANCELLED = "cancelled", "Cancelled"
        REFUNDED = "refunded", "Refunded"

    txnid = models.CharField(max_length=40, unique=True, default=new_txnid, editable=False)
    profile = models.ForeignKey(
        "profiles.Profile", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="payments",
    )
    plan = models.ForeignKey(
        "memberships.MembershipPlan", null=True, blank=True,
        on_delete=models.PROTECT, related_name="payments",
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    product_info = models.CharField(max_length=120)
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.INITIATED, db_index=True
    )
    environment = models.CharField(max_length=12, default="staging")

    # customer snapshot at checkout time
    first_name = models.CharField(max_length=80, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)

    # request
    surl = models.URLField(blank=True)
    furl = models.URLField(blank=True)
    request_hash = models.CharField(max_length=255, blank=True)

    # gateway response
    mihpayid = models.CharField(max_length=40, blank=True)
    mode = models.CharField(max_length=10, blank=True)
    unmapped_status = models.CharField(max_length=50, blank=True)
    bank_ref_num = models.CharField(max_length=40, blank=True)
    bankcode = models.CharField(max_length=30, blank=True)
    pg_type = models.CharField(max_length=20, blank=True)
    response_hash = models.CharField(max_length=255, blank=True)
    error_code = models.CharField(max_length=20, blank=True)
    error_message = models.CharField(max_length=120, blank=True)

    raw_request = models.JSONField(default=dict, blank=True)
    raw_response = models.JSONField(default=dict, blank=True)

    is_legacy = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "payment_transaction"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["profile", "status"])]

    def __str__(self):
        return f"{self.txnid} ({self.status})"
