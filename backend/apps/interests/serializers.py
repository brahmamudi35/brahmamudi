from rest_framework import serializers

from apps.profiles.serializers import ProfileListSerializer

from .models import Interest, InterestTemplate


class InterestTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterestTemplate
        fields = ("id", "text")


class InterestSerializer(serializers.ModelSerializer):
    sender_detail = ProfileListSerializer(source="sender", read_only=True)
    receiver_detail = ProfileListSerializer(source="receiver", read_only=True)

    class Meta:
        model = Interest
        fields = (
            "id", "sender", "receiver", "sender_detail", "receiver_detail",
            "template", "message", "status", "created_at", "responded_at",
        )
        read_only_fields = ("sender", "status", "responded_at")


class InterestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interest
        fields = ("id", "receiver", "template", "message")

    def validate_receiver(self, value):
        sender = self.context["request"].user.profile
        if value.pk == sender.pk:
            raise serializers.ValidationError("You cannot send an interest to yourself.")
        return value
