from rest_framework import serializers

from .models import SavedSearch


class SavedSearchSerializer(serializers.ModelSerializer):
    match_count = serializers.SerializerMethodField()

    class Meta:
        model = SavedSearch
        fields = (
            "id", "name", "filters", "alerts_enabled", "last_alerted_at",
            "match_count", "created_at",
        )
        read_only_fields = ("last_alerted_at", "created_at")

    def get_match_count(self, obj) -> int:
        if not self.context.get("with_counts"):
            return None
        from .services import run_search

        return run_search(obj).count()

    def validate_filters(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("filters must be an object.")
        return value
