from rest_framework import serializers

from .models import MembershipPlan, Subscription


class MembershipPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipPlan
        fields = (
            "id", "name", "slug", "description", "duration_months", "price_inr",
            "contact_views", "interests_per_day", "can_view_photos",
        )


class SubscriptionSerializer(serializers.ModelSerializer):
    plan = MembershipPlanSerializer(read_only=True)

    class Meta:
        model = Subscription
        fields = (
            "id", "plan", "status", "started_on", "expires_on",
            "is_legacy", "created_at",
        )
