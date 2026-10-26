from unittest import mock

from django.core import mail

from apps.moderation import sharing
from apps.moderation.models import StaffAction
from apps.notifications.models import Notification
from apps.reference.enums import Gender, ProfileStatus
from apps.testing import ApiTestCase, make_profile, make_user


def _run_now(fn, *args):
    fn(*args)


@mock.patch.object(sharing, "in_background", _run_now)
class ShareProfileTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(make_user(is_staff=True))
        self.bride = make_profile(gender=Gender.FEMALE, first_name="Lakshmi", regno="6230")
        self.url = f"/api/v1/moderation/profiles/{self.bride.pk}/share/"

    def _share(self, numbers):
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(self.url, {"numbers": numbers}, format="json")

    def test_sends_notification_and_email_to_each_groom(self):
        a = make_profile(gender=Gender.MALE, first_name="Ravi", regno="6231",
                         user=make_user(email="ravi@example.com"))
        b = make_profile(gender=Gender.MALE, first_name="Kiran", regno="6232",
                         user=make_user(email="kiran@example.com"))
        resp = self._share("6231, 6232\n6231")  # repeats are sent once
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual([r["regno"] for r in resp.data["sent"]], ["6231", "6232"])
        for groom in (a, b):
            n = Notification.objects.get(recipient=groom, kind="profile_shared")
            self.assertEqual(n.url, f"/profiles/{self.bride.pk}")
            self.assertIn("Lakshmi (6230)", n.text)
        self.assertEqual(sorted(m.to[0] for m in mail.outbox),
                         ["kiran@example.com", "ravi@example.com"])
        self.assertIn(f"/profiles/{self.bride.pk}", mail.outbox[0].body)
        entry = StaffAction.objects.get(action="share_profile")
        self.assertEqual(entry.data, {"count": 2, "to": ["6231", "6232"]})

    def test_old_site_number_by_its_leading_number(self):
        old = make_profile(gender=Gender.MALE, regno="6185-17 CA-S-VIP (R)", legacy_rid=6185)
        resp = self._share("6185")
        self.assertEqual([r["id"] for r in resp.data["sent"]], [old.pk])

    def test_reports_unknown_and_skipped_numbers(self):
        make_profile(gender=Gender.FEMALE, regno="6240")
        make_profile(gender=Gender.MALE, regno="6241", status=ProfileStatus.SUSPENDED)
        resp = self._share("6240 6241 9999 6230")
        self.assertEqual(resp.data["sent"], [])
        self.assertEqual(resp.data["not_found"], ["9999"])
        self.assertEqual(
            [(s["regno"], s["reason"]) for s in resp.data["skipped"]],
            [("6240", "same gender"), ("6241", "account is suspended by admin"),
             ("6230", "this is the same profile")],
        )
        self.assertFalse(Notification.objects.exists())
        self.assertFalse(StaffAction.objects.filter(action="share_profile").exists())

    def test_no_email_for_placeholder_address(self):
        make_profile(gender=Gender.MALE, regno="6250",
                     user=make_user(email="member-abc@brahmamudi.invalid"))
        resp = self._share("6250")
        self.assertEqual(len(resp.data["sent"]), 1)
        self.assertEqual(mail.outbox, [])

    def test_validation(self):
        self.assertEqual(self._share("  ").status_code, 400)
        too_many = " ".join(str(7000 + i) for i in range(sharing.MAX_RECIPIENTS + 1))
        self.assertEqual(self._share(too_many).status_code, 400)
        self.bride.status = ProfileStatus.HIDDEN
        self.bride.save()
        self.assertEqual(self._share("6231").status_code, 400)

    def test_staff_only(self):
        self.client.force_authenticate(make_profile(gender=Gender.MALE).user)
        self.assertEqual(self._share("6230").status_code, 403)
