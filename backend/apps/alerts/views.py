from rest_framework import decorators, permissions, response, viewsets
from rest_framework.pagination import LimitOffsetPagination

from apps.accounts.permissions import IsEmailVerified
from apps.profiles.serializers import ProfileListSerializer

from . import services
from .models import SavedSearch
from .serializers import SavedSearchSerializer


class SavedSearchViewSet(viewsets.ModelViewSet):
    serializer_class = SavedSearchSerializer
    permission_classes = [permissions.IsAuthenticated, IsEmailVerified]
    pagination_class = None  # a member keeps a handful of these

    def _profile(self):
        profile = getattr(self.request.user, "profile", None)
        if profile is None:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Create a profile first.")
        return profile

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return SavedSearch.objects.none()
        return SavedSearch.objects.filter(owner=self._profile())

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["with_counts"] = self.action in ("list", "retrieve")
        return ctx

    def perform_create(self, serializer):
        saved = serializer.save(owner=self._profile())
        # so the first alert only fires for members who join after this
        saved.last_seen_id = services.current_max_id(saved)
        saved.save(update_fields=["last_seen_id"])

    @decorators.action(detail=True, pagination_class=LimitOffsetPagination)
    def results(self, request, pk=None):
        saved = self.get_object()
        qs = services.run_search(saved)
        paginator = LimitOffsetPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        ser = ProfileListSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(ser.data)
