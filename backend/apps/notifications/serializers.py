from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.first_name", read_only=True, default="")
    read = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = (
            "id", "kind", "text", "url", "data", "actor", "actor_name",
            "read", "created_at",
        )

    def get_read(self, obj) -> bool:
        return obj.read_at is not None
