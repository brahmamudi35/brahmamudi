from rest_framework import status

from apps.interests.models import Interest
from apps.notifications.models import Notification
from apps.reference.enums import Gender
from apps.testing import ApiTestCase, make_profile, make_user


class NotificationTriggerTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.her = make_profile(gender=Gender.FEMALE, first_name="Asha")
        self.him = make_profile(gender=Gender.MALE, first_name="Ravi")

    def test_interest_creates_notifications_both_ways(self):
        self.client.force_authenticate(self.him.user)
        self.client.post("/api/v1/interests/", {"receiver": self.her.pk}, format="json")
        n = Notification.objects.get(recipient=self.her)
        self.assertEqual(n.kind, "interest_received")
        self.assertEqual(n.actor, self.him)
        self.assertIsNone(n.read_at)

        interest = Interest.objects.get()
        self.client.force_authenticate(self.her.user)
        self.client.post(f"/api/v1/interests/{interest.pk}/accept/")
        self.assertTrue(
            Notification.objects.filter(recipient=self.him, kind="interest_accepted").exists()
        )

    def test_profile_view_notifies_once_per_day(self):
        self.client.force_authenticate(self.him.user)
        self.client.get(f"/api/v1/profiles/{self.her.pk}/")
        self.client.get(f"/api/v1/profiles/{self.her.pk}/")
        self.assertEqual(
            Notification.objects.filter(recipient=self.her, kind="profile_view").count(), 1
        )

    def test_no_self_notification(self):
        self.client.force_authenticate(self.him.user)
        # viewing your own profile detail shouldn't notify (handled upstream) —
        # and notify() drops actor == recipient anyway
        self.client.get(f"/api/v1/profiles/{self.him.pk}/")
        self.assertFalse(Notification.objects.filter(recipient=self.him).exists())


class NotificationApiTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.me = make_profile(gender=Gender.MALE)
        for i in range(3):
            Notification.objects.create(recipient=self.me, kind="profile_view",
                                        text=f"view {i}")
        self.client.force_authenticate(self.me.user)

    def test_list_and_unread_count(self):
        self.assertEqual(len(self.client.get("/api/v1/notifications/").data["results"]), 3)
        self.assertEqual(
            self.client.get("/api/v1/notifications/unread-count/").data["unread"], 3
        )

    def test_mark_read_all_and_subset(self):
        first = Notification.objects.filter(recipient=self.me).first()
        r = self.client.post("/api/v1/notifications/read/", {"ids": [first.pk]},
                             format="json")
        self.assertEqual(r.data["marked"], 1)
        self.assertEqual(
            self.client.get("/api/v1/notifications/unread-count/").data["unread"], 2
        )
        self.client.post("/api/v1/notifications/read/", {}, format="json")
        self.assertEqual(
            self.client.get("/api/v1/notifications/unread-count/").data["unread"], 0
        )

    def test_only_my_notifications(self):
        other = make_profile(gender=Gender.FEMALE)
        Notification.objects.create(recipient=other, kind="profile_view", text="x")
        self.assertEqual(len(self.client.get("/api/v1/notifications/").data["results"]), 3)

    def test_needs_a_profile(self):
        self.client.force_authenticate(make_user())
        self.assertEqual(
            self.client.get("/api/v1/notifications/").status_code,
            status.HTTP_403_FORBIDDEN,
        )
