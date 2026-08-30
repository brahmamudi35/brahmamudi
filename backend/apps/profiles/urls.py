from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ProfilePhotoViewSet, ProfileViewSet, PublicStatsView

router = DefaultRouter()
router.register("profiles", ProfileViewSet, basename="profile")
router.register("profile-photos", ProfilePhotoViewSet, basename="profile-photo")

urlpatterns = [
    path("stats/", PublicStatsView.as_view(), name="public-stats"),
    *router.urls,
]
