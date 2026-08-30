from rest_framework.routers import DefaultRouter

from .views import MembershipPlanViewSet

router = DefaultRouter()
router.register("membership-plans", MembershipPlanViewSet, basename="membership-plan")

urlpatterns = router.urls
