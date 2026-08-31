from rest_framework.routers import DefaultRouter

from .views import (
    ModerationHoroscopeViewSet,
    ModerationPhotoViewSet,
    ModerationProfileViewSet,
    ModerationSummaryView,
)

router = DefaultRouter()
router.register("moderation/profiles", ModerationProfileViewSet, basename="moderation-profile")
router.register("moderation/photos", ModerationPhotoViewSet, basename="moderation-photo")
router.register("moderation/horoscopes", ModerationHoroscopeViewSet, basename="moderation-horoscope")
router.register("moderation/summary", ModerationSummaryView, basename="moderation-summary")

urlpatterns = router.urls
