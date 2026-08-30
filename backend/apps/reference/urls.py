from rest_framework.routers import DefaultRouter

from .views import EducationLevelViewSet, NakshatramViewSet, RaasiViewSet

router = DefaultRouter()
router.register("reference/nakshatram", NakshatramViewSet, basename="nakshatram")
router.register("reference/raasi", RaasiViewSet, basename="raasi")
router.register("reference/education-levels", EducationLevelViewSet, basename="education-level")

urlpatterns = router.urls
