from rest_framework import serializers

from apps.profiles.serializers import ProfileListSerializer

from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ("id", "conversation", "sender", "body", "created_at", "read_at")
        read_only_fields = ("conversation", "sender", "created_at", "read_at")


class ConversationSerializer(serializers.ModelSerializer):
    other = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ("id", "other", "last_message", "unread", "last_message_at", "created_at")

    def _me(self):
        return self.context["profile"]

    def get_other(self, obj):
        return ProfileListSerializer(obj.other(self._me()), context=self.context).data

    def get_last_message(self, obj):
        msg = obj.messages.order_by("-created_at").first()
        if not msg:
            return None
        return {"body": msg.body, "sender": msg.sender_id, "created_at": msg.created_at}

    def get_unread(self, obj) -> int:
        me = self._me()
        return obj.messages.filter(read_at__isnull=True).exclude(sender=me).count()
