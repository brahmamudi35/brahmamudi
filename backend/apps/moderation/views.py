"""Staff moderation API.

Profiles go live on creation; staff use these endpoints to award the verified
badge, suspend abuse, and approve member photos (when AUTO_APPROVE_PHOTOS is
off). Everything here is IsAdminUser.
"""

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import decorators, mixins, permissions, response, viewsets

from apps.profiles.models import Profile, ProfilePhoto
from apps.reference.enums import ProfileStatus

from .serializers import ModerationPhotoSerializer, ModerationProfileSerializer

_PHOTO_COUNTS = {
    "photo_count": Count("photos", distinct=True),
    "pending_photo_count": Count(
        "photos", filter=Q(photos__is_approved=False), distinct=True
    ),
}


class ModerationProfileViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = ModerationProfileSerializer

    def get_queryset(self):
        qs = (
            Profile.objects.select_related("user")
            .annotate(**_PHOTO_COUNTS)
            .order_by("-created_at")
        )
        if self.action != "list":
            return qs
        flt = self.request.query_params.get("filter", "unverified")
        if flt == "unverified":
            return qs.filter(is_verified=False).exclude(status=ProfileStatus.SUSPENDED)
        if flt == "suspended":
            return qs.filter(status=ProfileStatus.SUSPENDED)
        if flt == "verified":
            return qs.filter(is_verified=True)
        return qs

    def _set(self, request, **fields):
        profile = self.get_object()
        for k, v in fields.items():
            setattr(profile, k, v)
        profile.save(update_fields=list(fields))
        return response.Response(self.get_serializer(profile).data)

    @decorators.action(detail=True, methods=["post"])
    def verify(self, request, pk=None):
        return self._set(request, is_verified=True)

    @decorators.action(detail=True, methods=["post"])
    def unverify(self, request, pk=None):
        return self._set(request, is_verified=False)

    @decorators.action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        return self._set(request, status=ProfileStatus.SUSPENDED)

    @decorators.action(detail=True, methods=["post"])
    def reinstate(self, request, pk=None):
        return self._set(request, status=ProfileStatus.ACTIVE)


class ModerationPhotoViewSet(
    mixins.ListModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = ModerationPhotoSerializer

    def get_queryset(self):
        qs = ProfilePhoto.objects.select_related("profile").order_by("uploaded_at")
        if self.action == "list" and \
                self.request.query_params.get("filter", "pending") == "pending":
            return qs.filter(is_approved=False)
        return qs

    @decorators.action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        photo = self.get_object()
        photo.is_approved = True
        photo.save(update_fields=["is_approved"])
        return response.Response(self.get_serializer(photo).data)


class ModerationSummaryView(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    def list(self, request):
        today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        return response.Response({
            "unverified_profiles": Profile.objects.filter(is_verified=False)
            .exclude(status=ProfileStatus.SUSPENDED).count(),
            "suspended_profiles": Profile.objects.filter(
                status=ProfileStatus.SUSPENDED
            ).count(),
            "pending_photos": ProfilePhoto.objects.filter(is_approved=False).count(),
            "profiles_created_today": Profile.objects.filter(
                created_at__gte=today
            ).count(),
        })
