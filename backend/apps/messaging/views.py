from django.db import models
from django.shortcuts import get_object_or_404
from rest_framework import decorators, mixins, permissions, response, viewsets
from rest_framework.throttling import UserRateThrottle

from apps.profiles.models import Profile

from . import services
from .models import Conversation
from .serializers import ConversationSerializer, MessageSerializer


class MessageSendThrottle(UserRateThrottle):
    scope = "message_send"


class ConversationViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ConversationSerializer

    def _profile(self) -> Profile:
        profile = getattr(self.request.user, "profile", None)
        if profile is None:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Create a profile first.")
        return profile

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "profile": self._profile()}

    def get_queryset(self):
        me = self._profile()
        return (
            Conversation.objects.filter(
                models.Q(profile_a=me) | models.Q(profile_b=me)
            )
            .select_related("profile_a", "profile_b")
            .prefetch_related("messages")
        )

    def create(self, request):
        me = self._profile()
        other = get_object_or_404(Profile, pk=request.data.get("profile"))
        try:
            convo = services.get_or_create_conversation(me, other)
        except services.ChatNotAllowed as exc:
            return response.Response(
                {"detail": exc.detail, "code": exc.code}, status=403
            )
        return response.Response(
            self.get_serializer(convo).data, status=200
        )

    @decorators.action(detail=False, url_path="unread-count")
    def unread_count(self, request):
        return response.Response({"unread": services.unread_count(self._profile())})

    def get_throttles(self):
        if self.action == "messages" and self.request.method == "POST":
            return [*super().get_throttles(), MessageSendThrottle()]
        return super().get_throttles()

    @decorators.action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        me = self._profile()
        convo = self.get_object()

        if request.method == "POST":
            try:
                msg = services.post_message(convo, me, request.data.get("body", ""))
            except services.ChatNotAllowed as exc:
                return response.Response(
                    {"detail": exc.detail, "code": exc.code}, status=400
                )
            return response.Response(MessageSerializer(msg).data, status=201)

        services.mark_read(convo, me)
        qs = convo.messages.select_related("sender")
        page = self.paginate_queryset(qs)
        data = MessageSerializer(page if page is not None else qs, many=True).data
        return self.get_paginated_response(data) if page is not None \
            else response.Response(data)
