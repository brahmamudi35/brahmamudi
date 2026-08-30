from uuid import uuid4

from django.db.models import Prefetch
from rest_framework import (
    decorators,
    mixins,
    permissions,
    response,
    status,
    views,
    viewsets,
)
from rest_framework.parsers import FormParser, MultiPartParser

from apps.reference.enums import Gender, ProfileStatus

from . import services
from .filters import ProfileFilter
from .models import PartnerPreference, Profile, ProfilePhoto, ProfileView, Shortlist
from .serializers import (
    PartnerPreferenceSerializer,
    ProfileDetailSerializer,
    ProfileListSerializer,
    ProfilePhotoUploadSerializer,
    ProfileVisitorSerializer,
)


class ProfileViewSet(viewsets.ModelViewSet):
    """Browse other members; manage your own profile via /profiles/me/."""

    filterset_class = ProfileFilter
    search_fields = ["first_name", "surname", "regno", "occupation", "gothram"]
    ordering_fields = ["created_at", "date_of_birth", "height_cm"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = (
            Profile.objects.filter(status=ProfileStatus.ACTIVE)
            .select_related("nakshatram", "raasi", "education")
            .prefetch_related(
                Prefetch("photos", queryset=ProfilePhoto.objects.filter(is_approved=True))
            )
        )
        viewer = getattr(self.request.user, "profile", None)
        if viewer and not self.request.user.is_staff:
            opposite = Gender.FEMALE if viewer.gender == Gender.MALE else Gender.MALE
            qs = qs.filter(gender=opposite).exclude(pk=viewer.pk)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return ProfileListSerializer
        return ProfileDetailSerializer

    def get_permissions(self):
        if self.action in {"create", "destroy"}:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        viewer = getattr(request.user, "profile", None)
        if viewer and viewer.pk != instance.pk:
            services.record_view(viewer, instance)
        serializer = self.get_serializer(instance)
        return response.Response(serializer.data)

    # -- own profile --------------------------------------------------------

    @decorators.action(detail=False, methods=["get", "post", "put", "patch"])
    def me(self, request):
        profile = getattr(request.user, "profile", None)

        if request.method == "POST":
            if profile is not None:
                return response.Response(
                    {"detail": "Profile already exists; use PATCH."}, status=409
                )
            serializer = ProfileDetailSerializer(
                data=request.data, context={"request": request}
            )
            serializer.is_valid(raise_exception=True)
            profile = serializer.save(
                user=request.user,
                regno=f"BM-{uuid4().hex[:12]}",
                status=ProfileStatus.PENDING,
            )
            profile.regno = f"BM{profile.pk:06d}"
            profile.save(update_fields=["regno"])
            return response.Response(
                ProfileDetailSerializer(profile, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )

        if profile is None:
            return response.Response({"detail": "No profile yet."}, status=404)

        if request.method in ("PUT", "PATCH"):
            serializer = ProfileDetailSerializer(
                profile, data=request.data,
                partial=request.method == "PATCH", context={"request": request},
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return response.Response(serializer.data)
        return response.Response(
            ProfileDetailSerializer(profile, context={"request": request}).data
        )

    @decorators.action(detail=False, methods=["get", "put", "patch"], url_path="me/partner-preference")
    def partner_preference(self, request):
        profile = getattr(request.user, "profile", None)
        if profile is None:
            return response.Response({"detail": "No profile yet."}, status=404)
        pref, _ = PartnerPreference.objects.get_or_create(profile=profile)
        if request.method in ("PUT", "PATCH"):
            serializer = PartnerPreferenceSerializer(
                pref, data=request.data, partial=request.method == "PATCH"
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return response.Response(serializer.data)
        return response.Response(PartnerPreferenceSerializer(pref).data)

    @decorators.action(detail=False, url_path="me/contact-quota")
    def contact_quota(self, request):
        profile = getattr(request.user, "profile", None)
        if profile is None:
            return response.Response({"detail": "No profile yet."}, status=404)
        return response.Response(services.contact_quota(profile).as_dict)

    @decorators.action(detail=False, url_path="me/visitors")
    def visitors(self, request):
        profile = getattr(request.user, "profile", None)
        if profile is None:
            return response.Response({"detail": "No profile yet."}, status=404)
        qs = (
            ProfileView.objects.filter(viewed=profile)
            .select_related("viewer")
            .order_by("-last_viewed_at")
        )
        return self._paginated(qs, ProfileVisitorSerializer, direction="visitors")

    @decorators.action(detail=False, url_path="me/viewed")
    def viewed(self, request):
        profile = getattr(request.user, "profile", None)
        if profile is None:
            return response.Response({"detail": "No profile yet."}, status=404)
        qs = (
            ProfileView.objects.filter(viewer=profile)
            .select_related("viewed")
            .order_by("-last_viewed_at")
        )
        return self._paginated(qs, ProfileVisitorSerializer, direction="viewed")

    @decorators.action(detail=False, url_path="me/shortlist")
    def shortlist_list(self, request):
        profile = getattr(request.user, "profile", None)
        if profile is None:
            return response.Response({"detail": "No profile yet."}, status=404)
        targets = (
            Profile.objects.filter(shortlisted_by__owner=profile)
            .select_related("nakshatram", "raasi", "education")
            .prefetch_related("photos")
            .order_by("-shortlisted_by__created_at")
        )
        return self._paginated(targets, ProfileListSerializer)

    # -- actions on another profile --------------------------------------------

    @decorators.action(detail=True, methods=["post"], url_path="unlock-contact")
    def unlock_contact(self, request, pk=None):
        viewer = getattr(request.user, "profile", None)
        target = self.get_object()
        if viewer is None:
            return response.Response({"detail": "Create a profile first."}, status=400)
        if viewer.pk == target.pk:
            return response.Response({"detail": "That's your own profile."}, status=400)
        try:
            services.unlock_contact(viewer, target)
        except services.ContactUnlockError as exc:
            return response.Response(
                {"detail": str(exc), "code": exc.code},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        data = ProfileDetailSerializer(target, context={"request": request}).data
        data["quota"] = services.contact_quota(viewer).as_dict
        return response.Response(data)

    @decorators.action(detail=True, methods=["post", "delete"])
    def shortlist(self, request, pk=None):
        owner = getattr(request.user, "profile", None)
        target = self.get_object()
        if owner is None:
            return response.Response({"detail": "Create a profile first."}, status=400)
        if request.method == "DELETE":
            Shortlist.objects.filter(owner=owner, target=target).delete()
            return response.Response(status=status.HTTP_204_NO_CONTENT)
        Shortlist.objects.get_or_create(owner=owner, target=target)
        return response.Response({"shortlisted": True}, status=status.HTTP_201_CREATED)

    # -- helper -----------------------------------------------------------

    def _paginated(self, queryset, serializer_class, **ctx):
        page = self.paginate_queryset(queryset)
        context = {"request": self.request, **ctx}
        if page is not None:
            data = serializer_class(page, many=True, context=context).data
            return self.get_paginated_response(data)
        data = serializer_class(queryset, many=True, context=context).data
        return response.Response(data)


class PublicStatsView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []

    def get(self, request):
        from django.core.cache import cache

        data = cache.get("public_stats")
        if data is None:
            live = Profile.objects.filter(status=ProfileStatus.ACTIVE)
            data = {
                "active_profiles": live.count(),
                "brides": live.filter(gender=Gender.FEMALE).count(),
                "grooms": live.filter(gender=Gender.MALE).count(),
            }
            cache.set("public_stats", data, 600)
        return response.Response(data)


class ProfilePhotoViewSet(
    mixins.ListModelMixin, mixins.CreateModelMixin,
    mixins.DestroyModelMixin, viewsets.GenericViewSet,
):
    """Manage the signed-in member's own photos. New uploads await moderation."""

    serializer_class = ProfilePhotoUploadSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    pagination_class = None

    def _profile(self):
        profile = getattr(self.request.user, "profile", None)
        if profile is None:
            from rest_framework.exceptions import NotFound

            raise NotFound("Create a profile first.")
        return profile

    def get_queryset(self):
        return ProfilePhoto.objects.filter(profile=self._profile())

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "profile": self._profile()}

    @decorators.action(detail=True, methods=["post"], url_path="make-primary")
    def make_primary(self, request, pk=None):
        photo = self.get_object()
        self.get_queryset().exclude(pk=photo.pk).update(is_primary=False)
        photo.is_primary = True
        photo.save(update_fields=["is_primary"])
        return response.Response(self.get_serializer(photo).data)
