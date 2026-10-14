from apps.memberships.models import Subscription
from apps.moderation.models import StaffAction
from apps.payments.models import PaymentTransaction
from apps.reference.enums import Gender
from apps.testing import ApiTestCase, make_profile, make_user


class StaffAuditTrailTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.staff = make_user(email="desk@example.com", is_staff=True)
        self.client.force_authenticate(self.staff)
        self.p = make_profile(gender=Gender.FEMALE, first_name="Latha")

    def _url(self, suffix=""):
        return f"/api/v1/moderation/profiles/{self.p.pk}/{suffix}"

    def test_status_actions_are_recorded(self):
        for action in ("verify", "unverify", "suspend", "reinstate"):
            self.client.post(self._url(f"{action}/"))
        actions = list(
            StaffAction.objects.filter(profile=self.p).order_by("id").values_list("action", flat=True)
        )
        self.assertEqual(actions, ["verify", "unverify", "suspend", "reinstate"])
        entry = StaffAction.objects.filter(profile=self.p).first()
        self.assertEqual(entry.actor_email, "desk@example.com")
        self.assertEqual(entry.profile_regno, self.p.regno)

    def test_edit_records_only_changed_fields(self):
        self.client.patch(self._url(), {"first_name": "Lathika", "surname": self.p.surname},
                          format="json")
        entry = StaffAction.objects.get(action="edit_profile")
        self.assertEqual(entry.data["fields"], ["first_name"])

    def test_noop_edit_is_not_recorded(self):
        self.client.patch(self._url(), {"first_name": self.p.first_name}, format="json")
        self.assertFalse(StaffAction.objects.filter(action="edit_profile").exists())

    def test_audit_endpoint_filters_by_profile(self):
        other = make_profile(gender=Gender.MALE)
        self.client.post(self._url("verify/"))
        self.client.post(f"/api/v1/moderation/profiles/{other.pk}/suspend/")
        resp = self.client.get(f"/api/v1/moderation/audit/?profile={self.p.pk}")
        self.assertEqual(resp.status_code, 200)
        rows = resp.data["results"] if isinstance(resp.data, dict) else resp.data
        self.assertEqual([r["action"] for r in rows], ["verify"])

    def test_audit_endpoint_is_staff_only(self):
        self.client.force_authenticate(make_user())
        self.assertEqual(self.client.get("/api/v1/moderation/audit/").status_code, 403)


class GrantPlanPaymentRecordTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(make_user(email="desk@example.com", is_staff=True))
        self.p = make_profile(gender=Gender.FEMALE)
        self.url = f"/api/v1/moderation/profiles/{self.p.pk}/grant-plan/"

    def test_offline_payment_is_recorded_and_linked(self):
        resp = self.client.post(self.url, {
            "plan": "gold", "amount": 1950, "method": "upi", "reference": "UPI123",
            "note": "paid on WhatsApp",
        }, format="json")
        self.assertEqual(resp.status_code, 201)
        sub = Subscription.objects.get(pk=resp.data["id"])
        txn = sub.payment
        self.assertIsNotNone(txn)
        self.assertEqual(txn.status, PaymentTransaction.Status.SUCCESS)
        self.assertEqual(txn.environment, "manual")
        self.assertEqual(float(txn.amount), 1950.0)
        self.assertEqual((txn.mode, txn.bank_ref_num), ("upi", "UPI123"))
        self.assertEqual(txn.raw_request["granted_by"], "desk@example.com")
        audit = StaffAction.objects.get(action="grant_plan")
        self.assertEqual(audit.data["payment"], txn.pk)

    def test_complimentary_grant_records_zero_and_is_not_counted(self):
        resp = self.client.post(self.url, {"plan": "silver"}, format="json")
        self.assertEqual(resp.status_code, 201)
        txn = PaymentTransaction.objects.get(profile=self.p)
        self.assertEqual((float(txn.amount), txn.mode), (0.0, "comp"))
        summary = self.client.get("/api/v1/moderation/summary/").data
        self.assertEqual(summary["payments_succeeded_this_month"], 0)

    def test_paid_method_requires_amount_and_comp_rejects_one(self):
        r1 = self.client.post(self.url, {"plan": "gold", "method": "cash"}, format="json")
        r2 = self.client.post(self.url, {"plan": "gold", "method": "comp", "amount": 100},
                              format="json")
        r3 = self.client.post(self.url, {"plan": "gold", "method": "bitcoin", "amount": 1},
                              format="json")
        self.assertEqual((r1.status_code, r2.status_code, r3.status_code), (400, 400, 400))
        self.assertFalse(PaymentTransaction.objects.exists())

    def test_grant_emails_the_member(self):
        from django.core import mail

        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(self.url, {"plan": "silver", "amount": 1450, "method": "upi"},
                             format="json")
        self.assertEqual(len(mail.outbox), 1)
        msg = mail.outbox[0]
        self.assertEqual(msg.to, [self.p.user.email])
        self.assertIn("Silver membership is active", msg.subject)
        self.assertIn("Rs 1,450", msg.body)

    def test_revoke_is_recorded(self):
        sub_id = self.client.post(self.url, {"plan": "gold"}, format="json").data["id"]
        self.client.post(f"/api/v1/moderation/subscriptions/{sub_id}/revoke/")
        self.assertTrue(StaffAction.objects.filter(action="revoke_plan", profile=self.p).exists())
