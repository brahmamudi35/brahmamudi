from django.conf import settings
from django.db import models


class StaffAction(models.Model):
    """Audit trail of member-desk actions taken by staff (verify, suspend, edit,
    grant/revoke plans, photo & horoscope moderation). Append-only."""

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL,
        related_name="staff_actions",
    )
    actor_email = models.EmailField(blank=True)  # survives the actor being deleted
    action = models.CharField(max_length=40, db_index=True)
    profile = models.ForeignKey(
        "profiles.Profile", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="staff_actions",
    )
    profile_regno = models.CharField(max_length=20, blank=True)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "moderation_staff_action"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.actor_email} {self.action} {self.profile_regno}"
