from datetime import date, timedelta

from django.db import models


class MembershipPlan(models.Model):
    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    name = models.CharField(max_length=40, unique=True)
    slug = models.SlugField(max_length=40, unique=True)
    description = models.TextField(blank=True)

    duration_months = models.PositiveSmallIntegerField(
        help_text="0 = no expiry / free tier"
    )
    price_inr = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # entitlements (null = unlimited)
    contact_views = models.PositiveIntegerField(null=True, blank=True)
    interests_per_day = models.PositiveIntegerField(null=True, blank=True)
    can_view_photos = models.BooleanField(default=True)

    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "membership_plan"
        ordering = ["sort_order", "price_inr"]

    def __str__(self):
        return self.name

    @property
    def is_free(self):
        return self.price_inr == 0

    def expiry_from(self, start: date) -> date | None:
        if not self.duration_months:
            return None
        # approximate a month as 30 days; good enough for validity windows
        return start + timedelta(days=30 * self.duration_months)


class Subscription(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending payment"
        ACTIVE = "active", "Active"
        EXPIRED = "expired", "Expired"
        CANCELLED = "cancelled", "Cancelled"

    profile = models.ForeignKey(
        "profiles.Profile", on_delete=models.CASCADE, related_name="subscriptions"
    )
    plan = models.ForeignKey(MembershipPlan, on_delete=models.PROTECT, related_name="subscriptions")
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    started_on = models.DateField(null=True, blank=True)
    expires_on = models.DateField(null=True, blank=True)
    payment = models.ForeignKey(
        "payments.PaymentTransaction", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="subscriptions",
    )
    is_legacy = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "membership_subscription"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["profile", "status"])]

    def __str__(self):
        return f"{self.profile_id} -> {self.plan.name} ({self.status})"

    @property
    def is_current(self):
        if self.status != self.Status.ACTIVE:
            return False
        if self.expires_on and self.expires_on < date.today():
            return False
        return True
