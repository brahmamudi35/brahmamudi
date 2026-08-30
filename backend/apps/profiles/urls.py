from rest_framework.routers import DefaultRouter

from .views import ProfilePhotoViewSet, ProfileViewSet

router = DefaultRouter()
router.register("profiles", ProfileViewSet, basename="profile")
router.register("profile-photos", ProfilePhotoViewSet, basename="profile-photo")

urlpatterns = router.urls
