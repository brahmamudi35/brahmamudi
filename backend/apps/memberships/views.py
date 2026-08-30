from rest_framework import decorators, mixins, permissions, response, viewsets

from .models import MembershipPlan, Subscription
from .serializers import MembershipPlanSerializer, SubscriptionSerializer


class MembershipPlanViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = MembershipPlan.objects.filter(is_active=True)
    serializer_class = MembershipPlanSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    @decorators.action(detail=False, permission_classes=[permissions.IsAuthenticated])
    def my_subscription(self, request):
        profile = getattr(request.user, "profile", None)
        if profile is None:
            return response.Response({"detail": "No profile yet."}, status=404)
        sub = (
            Subscription.objects.filter(profile=profile, status=Subscription.Status.ACTIVE)
            .select_related("plan")
            .order_by("-created_at")
            .first()
        )
        from apps.profiles.services import contact_quota

        data = SubscriptionSerializer(sub).data if sub else None
        return response.Response({
            "subscription": data,
            "contact_quota": contact_quota(profile).as_dict,
        })
