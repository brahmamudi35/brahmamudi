from rest_framework import status

from apps.reference.enums import Gender
from apps.testing import ApiTestCase, give_subscription, make_profile


class MembershipPlanApiTests(ApiTestCase):
    def test_plans_are_public(self):
        resp = self.client.get("/api/v1/membership-plans/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        slugs = {p["slug"] for p in resp.data}
        self.assertEqual(slugs, {"free", "silver", "gold", "platinum"})

    def test_my_subscription_none_by_default(self):
        profile = make_profile(gender=Gender.MALE)
        self.client.force_authenticate(profile.user)
        resp = self.client.get("/api/v1/membership-plans/my_subscription/")
        self.assertIsNone(resp.data["subscription"])
        self.assertEqual(resp.data["contact_quota"]["plan"], "free")

    def test_my_subscription_reports_active_plan_and_quota(self):
        profile = make_profile(gender=Gender.MALE)
        give_subscription(profile, "gold")
        self.client.force_authenticate(profile.user)
        resp = self.client.get("/api/v1/membership-plans/my_subscription/")
        self.assertEqual(resp.data["subscription"]["plan"]["slug"], "gold")
        self.assertEqual(resp.data["subscription"]["status"], "active")
        self.assertEqual(resp.data["contact_quota"]["limit"], 50)
