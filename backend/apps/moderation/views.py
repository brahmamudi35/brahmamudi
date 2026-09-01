"""Staff moderation & member-desk API.

Profiles go live on creation; staff use these endpoints to award the verified
badge, suspend abuse, approve member photos, edit a member's bio-data on their
behalf, comp a membership, and look up payments. Everything here is IsAdminUser
(``is_staff``) — the Django admin is reserved for superusers.
"""

from django.db.models import Count, Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import decorators, filters, mixins, permissions, response, viewsets
from rest_framework.exceptions import ValidationError

from apps.memberships.models import MembershipPlan, Subscription
from apps.payments.models import PaymentTransaction
from apps.profiles.models import HoroscopeDocument, Profile, ProfilePhoto
from apps.reference.enums import ProfileStatus

from .filters import ModerationPaymentFilter, ModerationProfileFilter
from .serializers import (
    ModerationHoroscopeSerializer,
    ModerationPaymentSerializer,
    ModerationPhotoSerializer,
    ModerationProfileDetailSerializer,
    ModerationProfileSerializer,
    ModerationProfileWriteSerializer,
    ModerationSubscriptionSerializer,
)
from .services import grant_plan, revoke_subscription

_PHOTO_COUNTS = {
    "photo_count": Count("photos", distinct=True),
    "pending_photo_count": Count(
        "photos", filter=Q(photos__is_approved=False), distinct=True
    ),
}


class ModerationProfileViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ModerationProfileFilter
    search_fields = [
        "regno", "first_name", "surname", "user__email", "user__phone",
        "contact_phone", "parent_phone", "occupation", "company", "gothram",
    ]
    ordering_fields = ["created_at", "date_of_birth", "regno", "first_name"]
    ordering = ["-created_at"]

    _PRESETS = {
        "unverified": lambda qs: qs.filter(is_verified=False).exclude(
            status=ProfileStatus.SUSPENDED
        ),
        "verified": lambda qs: qs.filter(is_verified=True),
        "suspended": lambda qs: qs.filter(status=ProfileStatus.SUSPENDED),
        "all": lambda qs: qs,
    }

    def get_serializer_class(self):
        if self.action in ("update", "partial_update"):
            return ModerationProfileWriteSerializer
        if self.action == "retrieve":
            return ModerationProfileDetailSerializer
        return ModerationProfileSerializer

    def get_queryset(self):
        qs = (
            Profile.objects.select_related("user")
            .prefetch_related("subscriptions__plan")
            .annotate(**_PHOTO_COUNTS)
        )
        if self.action == "retrieve":
            qs = qs.prefetch_related("photos", "horoscope", "partner_preference")
        if self.action != "list":
            return qs
        preset = self._PRESETS.get(self.request.query_params.get("filter", "all"))
        return preset(qs) if preset else qs

    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True  # staff edits are always partial
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        instance.refresh_from_db()
        return response.Response(
            ModerationProfileDetailSerializer(
                instance, context=self.get_serializer_context()
            ).data
        )

    def _set(self, request, **fields):
        profile = self.get_object()
        for k, v in fields.items():
            setattr(profile, k, v)
        profile.save(update_fields=list(fields))
        return response.Response(ModerationProfileSerializer(profile).data)

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

    @extend_schema(request=OpenApiTypes.OBJECT, responses=ModerationSubscriptionSerializer)
    @decorators.action(detail=True, methods=["post"], url_path="grant-plan")
    def grant_plan(self, request, pk=None):
        """Body: {"plan": "<slug>", "months": <int, optional>}."""
        profile = self.get_object()
        slug = request.data.get("plan")
        plan = MembershipPlan.objects.filter(slug=slug).first()
        if plan is None:
            raise ValidationError({"plan": "Unknown plan."})
        months = request.data.get("months")
        try:
            months = int(months) if months not in (None, "") else None
        except (TypeError, ValueError):
            raise ValidationError({"months": "Must be a whole number."})
        sub = grant_plan(profile, plan, months=months, actor=request.user)
        return response.Response(
            ModerationSubscriptionSerializer(sub).data, status=201
        )

    @decorators.action(detail=True, methods=["get"])
    def subscriptions(self, request, pk=None):
        profile = self.get_object()
        qs = profile.subscriptions.select_related("plan").order_by("-created_at")
        return response.Response(
            ModerationSubscriptionSerializer(qs, many=True).data
        )


class ModerationSubscriptionViewSet(
    mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = ModerationSubscriptionSerializer
    queryset = Subscription.objects.select_related("plan", "profile")

    @decorators.action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        sub = revoke_subscription(self.get_object())
        return response.Response(self.get_serializer(sub).data)


class ModerationPaymentViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = ModerationPaymentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ModerationPaymentFilter
    search_fields = ["txnid", "mihpayid", "email", "phone", "profile__regno",
                     "profile__first_name"]
    ordering_fields = ["created_at", "amount"]
    ordering = ["-created_at"]
    queryset = PaymentTransaction.objects.select_related("profile", "plan")


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


class ModerationHoroscopeViewSet(
    mixins.ListModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = ModerationHoroscopeSerializer

    def get_queryset(self):
        qs = HoroscopeDocument.objects.select_related("profile").order_by("uploaded_at")
        if self.action == "list" and \
                self.request.query_params.get("filter", "pending") == "pending":
            return qs.filter(is_approved=False)
        return qs

    @decorators.action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        doc = self.get_object()
        doc.is_approved = True
        doc.save(update_fields=["is_approved"])
        from apps.notifications.services import notify

        notify(doc.profile, "photo_approved",
               text="Your horoscope was approved", url="/profile/photos")
        return response.Response(self.get_serializer(doc).data)

    def perform_destroy(self, instance):
        profile = instance.profile
        instance.file.delete(save=False)
        instance.delete()
        from apps.notifications.services import notify

        notify(profile, "photo_rejected",
               text="The horoscope you uploaded was removed by our team",
               url="/profile/photos")


@extend_schema(responses={200: OpenApiTypes.OBJECT})
class ModerationSummaryView(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    def list(self, request):
        today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = today.replace(day=1)
        paid = (
            Subscription.objects.filter(
                status=Subscription.Status.ACTIVE, plan__price_inr__gt=0
            )
            .values("profile").distinct().count()
        )
        return response.Response({
            "total_members": Profile.objects.count(),
            "unverified_profiles": Profile.objects.filter(is_verified=False)
            .exclude(status=ProfileStatus.SUSPENDED).count(),
            "suspended_profiles": Profile.objects.filter(
                status=ProfileStatus.SUSPENDED
            ).count(),
            "pending_photos": ProfilePhoto.objects.filter(is_approved=False).count(),
            "pending_horoscopes": HoroscopeDocument.objects.filter(
                is_approved=False
            ).count(),
            "profiles_created_today": Profile.objects.filter(
                created_at__gte=today
            ).count(),
            "paid_members": paid,
            "payments_succeeded_this_month": PaymentTransaction.objects.filter(
                status=PaymentTransaction.Status.SUCCESS, created_at__gte=month_start
            ).count(),
        })
