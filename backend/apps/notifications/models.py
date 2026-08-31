from django.db import models


class Notification(models.Model):
    class Kind(models.TextChoices):
        INTEREST_RECEIVED = "interest_received", "Interest received"
        INTEREST_ACCEPTED = "interest_accepted", "Interest accepted"
        INTEREST_DECLINED = "interest_declined", "Interest declined"
        PROFILE_VIEW = "profile_view", "Profile viewed"
        PROFILE_VERIFIED = "profile_verified", "Profile verified"
        PHOTO_APPROVED = "photo_approved", "Photo approved"
        PHOTO_REJECTED = "photo_rejected", "Photo rejected"
        SUBSCRIPTION_ACTIVATED = "subscription_activated", "Membership activated"
        SEARCH_ALERT = "search_alert", "New matches"

    recipient = models.ForeignKey(
        "profiles.Profile", on_delete=models.CASCADE, related_name="notifications"
    )
    kind = models.CharField(max_length=32, choices=Kind.choices, db_index=True)
    actor = models.ForeignKey(
        "profiles.Profile", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="+",
    )
    text = models.CharField(max_length=255)
    url = models.CharField(max_length=255, blank=True)
    data = models.JSONField(default=dict, blank=True)

    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notification"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["recipient", "-created_at"])]

    def __str__(self):
        return f"{self.kind} -> {self.recipient_id}"
