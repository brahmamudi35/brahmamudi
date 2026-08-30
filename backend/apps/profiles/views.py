from django.db.models import Prefetch
from rest_framework import decorators, permissions, response, viewsets

from apps.reference.enums import Gender, ProfileStatus

from .filters import ProfileFilter
from .models import Profile, ProfilePhoto
from .serializers import ProfileDetailSerializer, ProfileListSerializer


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
            # matrimony convention: show the opposite gender, hide self
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

    @decorators.action(detail=False, methods=["get", "put", "patch"])
    def me(self, request):
        profile = getattr(request.user, "profile", None)
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
