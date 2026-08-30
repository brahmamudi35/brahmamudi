from django.core import mail
from rest_framework import status

from apps.interests.models import Interest
from apps.reference.enums import Gender
from apps.testing import ApiTestCase, give_subscription, make_profile


class InterestTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.her = make_profile(gender=Gender.FEMALE, first_name="Asha")
        self.him = make_profile(gender=Gender.MALE, first_name="Ravi")

    def _send(self, message="Hello", expect=status.HTTP_201_CREATED):
        self.client.force_authenticate(self.him.user)
        with self.captureOnCommitCallbacks(execute=True):
            resp = self.client.post("/api/v1/interests/",
                                    {"receiver": self.her.pk, "message": message},
                                    format="json")
        self.assertEqual(resp.status_code, expect, resp.data)
        return resp

    def test_send_interest_emails_the_receiver(self):
        self._send()
        self.assertEqual(Interest.objects.count(), 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.her.user.email])
        self.assertIn("expressed interest", mail.outbox[0].subject.lower())

    def test_cannot_send_to_self(self):
        self.client.force_authenticate(self.him.user)
        resp = self.client.post("/api/v1/interests/",
                                {"receiver": self.him.pk}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_active_interest_is_blocked(self):
        self._send()
        self._send(expect=status.HTTP_400_BAD_REQUEST)

    def test_daily_limit_is_enforced_for_free_members(self):
        # Free plan allows 5 interests/day; create 5 receivers, send to each.
        for _ in range(5):
            target = make_profile(gender=Gender.FEMALE)
            self.client.force_authenticate(self.him.user)
            r = self.client.post("/api/v1/interests/",
                                 {"receiver": target.pk}, format="json")
            self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        resp = self._send(expect=status.HTTP_400_BAD_REQUEST)
        self.assertIn("limit", str(resp.data).lower())

    def test_unlimited_plan_has_no_daily_limit(self):
        give_subscription(self.him, "platinum")
        self.client.force_authenticate(self.him.user)
        resp = self.client.get("/api/v1/interests/quota/")
        self.assertTrue(resp.data["unlimited"])
        self.assertIsNone(resp.data["remaining"])

    def test_accept_notifies_sender_and_sets_status(self):
        self._send()
        interest = Interest.objects.get()
        mail.outbox.clear()
        self.client.force_authenticate(self.her.user)
        with self.captureOnCommitCallbacks(execute=True):
            resp = self.client.post(f"/api/v1/interests/{interest.pk}/accept/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        interest.refresh_from_db()
        self.assertEqual(interest.status, Interest.Status.ACCEPTED)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.him.user.email])

    def test_only_receiver_can_accept(self):
        self._send()
        interest = Interest.objects.get()
        self.client.force_authenticate(self.him.user)
        resp = self.client.post(f"/api/v1/interests/{interest.pk}/accept/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_box_filters(self):
        self._send()
        self.client.force_authenticate(self.her.user)
        received = self.client.get("/api/v1/interests/?box=received")
        self.assertEqual(len(received.data["results"]), 1)
        sent = self.client.get("/api/v1/interests/?box=sent")
        self.assertEqual(len(sent.data["results"]), 0)

    def test_withdraw_after_decline_allows_resend(self):
        self._send()
        interest = Interest.objects.get()
        self.client.force_authenticate(self.her.user)
        self.client.post(f"/api/v1/interests/{interest.pk}/decline/")
        # declined is not an "open" state, so a fresh interest is allowed
        self._send()
        self.assertEqual(Interest.objects.count(), 2)
