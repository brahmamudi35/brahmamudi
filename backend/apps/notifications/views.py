from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import decorators, mixins, permissions, response, viewsets

from . import services
from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer

    def _profile(self):
        profile = getattr(self.request.user, "profile", None)
        if profile is None:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Create a profile first.")
        return profile

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Notification.objects.none()
        return (
            Notification.objects.filter(recipient=self._profile())
            .select_related("actor")
        )

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    @decorators.action(detail=False, url_path="unread-count")
    def unread_count(self, request):
        return response.Response({"unread": services.unread_count(self._profile())})

    @extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
    @decorators.action(detail=False, methods=["post"])
    def read(self, request):
        ids = request.data.get("ids")
        n = services.mark_read(self._profile(), ids if isinstance(ids, list) else None)
        return response.Response({"marked": n})
