from django.db import models, transaction
from django.utils import timezone
from rest_framework import decorators, mixins, permissions, response, viewsets

from . import emails, services
from .models import Interest, InterestTemplate
from .serializers import (
    InterestCreateSerializer,
    InterestSerializer,
    InterestTemplateSerializer,
)


class InterestTemplateViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = InterestTemplate.objects.filter(is_active=True)
    serializer_class = InterestTemplateSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class InterestViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin,
    mixins.CreateModelMixin, viewsets.GenericViewSet,
):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return InterestCreateSerializer if self.action == "create" else InterestSerializer

    def get_queryset(self):
        profile = self.request.user.profile
        qs = Interest.objects.select_related(
            "sender", "sender__user", "receiver", "receiver__user", "template"
        )
        box = self.request.query_params.get("box")
        if box == "sent":
            return qs.filter(sender=profile)
        if box == "received":
            return qs.filter(receiver=profile)
        return qs.filter(models.Q(sender=profile) | models.Q(receiver=profile))

    def perform_create(self, serializer):
        interest = serializer.save(sender=self.request.user.profile)
        transaction.on_commit(lambda: emails.notify_interest_received(interest))

    def _respond(self, request, pk, new_status):
        interest = self.get_object()
        if interest.receiver_id != request.user.profile.pk:
            return response.Response({"detail": "Not your interest to answer."}, status=403)
        interest.status = new_status
        interest.responded_at = timezone.now()
        interest.save(update_fields=["status", "responded_at"])
        transaction.on_commit(lambda: emails.notify_interest_response(interest))
        return response.Response(InterestSerializer(interest).data)

    @decorators.action(detail=False)
    def quota(self, request):
        profile = request.user.profile
        limit = services.daily_interest_limit(profile)
        return response.Response({
            "limit": limit,
            "unlimited": limit is None,
            "sent_today": services.interests_sent_today(profile),
            "remaining": services.remaining_interests_today(profile),
        })

    @decorators.action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        return self._respond(request, pk, Interest.Status.ACCEPTED)

    @decorators.action(detail=True, methods=["post"])
    def decline(self, request, pk=None):
        return self._respond(request, pk, Interest.Status.DECLINED)

    @decorators.action(detail=True, methods=["post"])
    def withdraw(self, request, pk=None):
        interest = self.get_object()
        if interest.sender_id != request.user.profile.pk:
            return response.Response({"detail": "Not your interest."}, status=403)
        interest.status = Interest.Status.WITHDRAWN
        interest.save(update_fields=["status"])
        return response.Response(InterestSerializer(interest).data)
