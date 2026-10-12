from django.contrib.auth import get_user_model
from django.core import mail

from apps.memberships.models import MembershipPlan
from apps.payments.models import PaymentTransaction
from apps.profiles.models import Profile
from apps.reference.enums import Gender
from apps.testing import ApiTestCase, make_profile, make_user

User = get_user_model()
URL = "/api/v1/auth/delete-account/"


class DeleteAccountTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.profile = make_profile(gender=Gender.FEMALE)
        self.user = self.profile.user
        self.client.force_authenticate(self.user)

    def test_wrong_password_keeps_the_account(self):
        resp = self.client.post(URL, {"password": "nope"}, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())

    def test_deletes_user_and_profile_but_keeps_payments(self):
        txn = PaymentTransaction.objects.create(
            profile=self.profile, plan=MembershipPlan.objects.get(slug="silver"),
            amount=1450, product_info="Silver", status=PaymentTransaction.Status.SUCCESS,
        )
        resp = self.client.post(URL, {"password": "s3cret-pass-123"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())
        self.assertFalse(Profile.objects.filter(pk=self.profile.pk).exists())
        txn.refresh_from_db()
        self.assertIsNone(txn.profile)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("deleted", mail.outbox[0].subject)

    def test_passwordless_account_must_type_delete(self):
        self.user.set_unusable_password()
        self.user.save()
        self.assertEqual(self.client.post(URL, {"confirm": "yes"}, format="json").status_code, 400)
        self.assertEqual(self.client.post(URL, {"confirm": "delete"}, format="json").status_code, 200)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())

    def test_staff_cannot_self_delete(self):
        staff = make_user(is_staff=True)
        self.client.force_authenticate(staff)
        resp = self.client.post(URL, {"password": "s3cret-pass-123"}, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(User.objects.filter(pk=staff.pk).exists())

    def test_requires_login(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post(URL, {}, format="json").status_code, 401)
