from rest_framework.routers import DefaultRouter

from .views import InterestTemplateViewSet, InterestViewSet

router = DefaultRouter()
router.register("interest-templates", InterestTemplateViewSet, basename="interest-template")
router.register("interests", InterestViewSet, basename="interest")

urlpatterns = router.urls
