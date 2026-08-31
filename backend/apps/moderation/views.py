"""Staff moderation API.

Profiles go live on creation; staff use these endpoints to award the verified
badge, suspend abuse, and approve member photos (when AUTO_APPROVE_PHOTOS is
off). Everything here is IsAdminUser.
"""

from django.db.models import Count, Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import decorators, filters, mixins, permissions, response, viewsets

from apps.profiles.models import Profile, ProfilePhoto
from apps.reference.enums import ProfileStatus

from .filters import ModerationProfileFilter
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
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ModerationProfileFilter
    search_fields = [
        "regno", "first_name", "surname", "user__email", "user__phone",
        "contact_phone", "parent_phone", "occupation", "company", "gothram",
    ]
    ordering_fields = ["created_at", "date_of_birth", "regno", "first_name"]
    ordering = ["-created_at"]

    # `filter=` presets for the moderation queues; the granular filters
    # (gender, subcaste, age, plan, …) come from ModerationProfileFilter and
    # combine with whichever preset is active.
    _PRESETS = {
        "unverified": lambda qs: qs.filter(is_verified=False).exclude(
            status=ProfileStatus.SUSPENDED
        ),
        "verified": lambda qs: qs.filter(is_verified=True),
        "suspended": lambda qs: qs.filter(status=ProfileStatus.SUSPENDED),
        "all": lambda qs: qs,
    }

    def get_queryset(self):
        qs = (
            Profile.objects.select_related("user")
            .prefetch_related("subscriptions__plan")
            .annotate(**_PHOTO_COUNTS)
        )
        if self.action != "list":
            return qs
        preset = self._PRESETS.get(self.request.query_params.get("filter", "all"))
        return preset(qs) if preset else qs

    def _set(self, request, **fields):
        profile = self.get_object()
        for k, v in fields.items():
            setattr(profile, k, v)
        profile.save(update_fields=list(fields))
        return response.Response(self.get_serializer(profile).data)

    @decorators.action(detail=True, methods=["post"])
    def verify(self, request, pk=None):
        resp = self._set(request, is_verified=True)
        from apps.notifications.services import notify

        notify(self.get_object(), "profile_verified",
               text="Your profile is now verified", url="/dashboard")
        return resp

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
        from apps.notifications.services import notify

        notify(photo.profile, "photo_approved",
               text="Your photo was approved", url="/profile/photos")
        return response.Response(self.get_serializer(photo).data)

    def perform_destroy(self, instance):
        profile = instance.profile
        instance.image.delete(save=False)
        instance.delete()
        from apps.notifications.services import notify

        notify(profile, "photo_rejected",
               text="A photo you uploaded was removed by our team",
               url="/profile/photos")


@extend_schema(responses={200: OpenApiTypes.OBJECT})
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
