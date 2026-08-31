from django.db import models


class SavedSearch(models.Model):
    owner = models.ForeignKey(
        "profiles.Profile", on_delete=models.CASCADE, related_name="saved_searches"
    )
    name = models.CharField(max_length=80)
    # A subset of the /profiles/ query params: age_min/max, height_min/max,
    # subcaste[], region[], marital_status[], food_habit, gothram, country_living,
    # nakshatram, raasi, search (keyword).
    filters = models.JSONField(default=dict, blank=True)

    alerts_enabled = models.BooleanField(default=True)
    last_seen_id = models.PositiveBigIntegerField(
        default=0, help_text="Highest matching Profile id already delivered."
    )
    last_alerted_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "saved_search"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["owner", "-created_at"])]

    def __str__(self):
        return f"{self.name} ({self.owner_id})"
