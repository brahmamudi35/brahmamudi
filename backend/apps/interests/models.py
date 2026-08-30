from django.db import models


class InterestTemplate(models.Model):
    """The canned 'express interest' messages (legacy tbl_msgtypes)."""

    legacy_msgcatid = models.IntegerField(null=True, blank=True, unique=True)
    text = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "interest_template"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.text[:60]


class Interest(models.Model):
    class Status(models.TextChoices):
        SENT = "sent", "Sent"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        WITHDRAWN = "withdrawn", "Withdrawn"

    sender = models.ForeignKey(
        "profiles.Profile", on_delete=models.CASCADE, related_name="sent_interests"
    )
    receiver = models.ForeignKey(
        "profiles.Profile", on_delete=models.CASCADE, related_name="received_interests"
    )
    template = models.ForeignKey(
        InterestTemplate, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="interests",
    )
    message = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.SENT, db_index=True
    )
    legacy_mid = models.IntegerField(null=True, blank=True, unique=True)
    legacy_status = models.CharField(max_length=4, blank=True)

    created_on = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "interest"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["receiver", "status"]),
            models.Index(fields=["sender", "status"]),
        ]

    def __str__(self):
        return f"{self.sender_id} -> {self.receiver_id} ({self.status})"
