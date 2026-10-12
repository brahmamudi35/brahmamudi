from rest_framework.routers import DefaultRouter

from .views import (
    ModerationAuditViewSet,
    ModerationHoroscopeViewSet,
    ModerationPaymentViewSet,
    ModerationPhotoViewSet,
    ModerationProfileViewSet,
    ModerationSubscriptionViewSet,
    ModerationSummaryView,
)

router = DefaultRouter()
router.register("moderation/profiles", ModerationProfileViewSet, basename="moderation-profile")
router.register("moderation/subscriptions", ModerationSubscriptionViewSet, basename="moderation-subscription")
router.register("moderation/payments", ModerationPaymentViewSet, basename="moderation-payment")
router.register("moderation/photos", ModerationPhotoViewSet, basename="moderation-photo")
router.register("moderation/horoscopes", ModerationHoroscopeViewSet, basename="moderation-horoscope")
router.register("moderation/audit", ModerationAuditViewSet, basename="moderation-audit")
router.register("moderation/summary", ModerationSummaryView, basename="moderation-summary")

urlpatterns = router.urls
