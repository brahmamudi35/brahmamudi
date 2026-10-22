from datetime import date

from django.test import override_settings

from apps.memberships.models import MembershipPlan, Subscription
from apps.payments import services
from apps.payments.models import PaymentTransaction, PayUCredential
from apps.payments.services import PayUConfig, build_request_hash, verify_response_hash
from apps.reference.enums import Gender
from apps.testing import ApiTestCase, make_profile

CFG = PayUConfig(key="testkey", salt="testsalt", base_url="https://test.payu.in")


class PayUHashTests(ApiTestCase):
    def test_request_hash_is_deterministic(self):
        kw = dict(txnid="abc123", amount="1500.00", productinfo="Silver",
                  firstname="Ravi", email="ravi@example.com", udf=["7"])
        self.assertEqual(build_request_hash(CFG, **kw), build_request_hash(CFG, **kw))

    def test_request_hash_matches_payu_formula(self):
        # Spelled out exactly as PayU documents it:
        # sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
        import hashlib
        raw = "testkey|abc123|1500.00|Silver|Ravi|ravi@example.com|7|||||" + "|||||" + "testsalt"
        self.assertEqual(raw.count("|"), 16)
        self.assertEqual(
            build_request_hash(CFG, txnid="abc123", amount="1500.00", productinfo="Silver",
                               firstname="Ravi", email="ravi@example.com", udf=["7"]),
            hashlib.sha512(raw.encode()).hexdigest(),
        )

    def test_response_hash_roundtrips(self):
        data = {
            "status": "success", "txnid": "abc123", "amount": "1500.00",
            "productinfo": "Silver", "firstname": "Ravi", "email": "ravi@example.com",
            "udf1": "7", "udf2": "", "udf3": "", "udf4": "", "udf5": "",
        }
        import hashlib
        # PayU: sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
        raw = (
            f"{CFG.salt}|{data['status']}||||||" + "|".join([
                "", "", "", "", "7",
                data["email"], data["firstname"], data["productinfo"],
                data["amount"], data["txnid"], CFG.key,
            ])
        )
        self.assertEqual(raw.count("|"), 17)
        data["hash"] = hashlib.sha512(raw.encode()).hexdigest().lower()
        self.assertTrue(verify_response_hash(CFG, data))

        data["status"] = "failure"  # tamper
        self.assertFalse(verify_response_hash(CFG, data))


class ActivateMembershipTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.profile = make_profile(gender=Gender.MALE)
        self.plan = MembershipPlan.objects.get(slug="gold")
        self.txn = PaymentTransaction.objects.create(
            profile=self.profile, plan=self.plan, amount=self.plan.price_inr,
            product_info=self.plan.name, status=PaymentTransaction.Status.SUCCESS,
        )

    def test_activates_and_is_idempotent(self):
        services.activate_membership(self.txn)
        services.activate_membership(self.txn)
        subs = Subscription.objects.filter(profile=self.profile)
        self.assertEqual(subs.count(), 1)
        sub = subs.get()
        self.assertEqual(sub.status, Subscription.Status.ACTIVE)
        self.assertEqual(sub.plan, self.plan)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, "active")

    def test_supersedes_a_prior_active_subscription(self):
        silver = MembershipPlan.objects.get(slug="silver")
        Subscription.objects.create(
            profile=self.profile, plan=silver, status=Subscription.Status.ACTIVE,
            started_on=date.today(),
        )
        services.activate_membership(self.txn)
        statuses = sorted(
            Subscription.objects.filter(profile=self.profile).values_list("plan__slug", "status")
        )
        self.assertEqual(statuses, [("gold", "active"), ("silver", "expired")])


@override_settings(PAYU_ENABLED=True)
class PayUReturnViewTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        PayUCredential.objects.create(
            environment="staging", merchant_key="testkey",
            merchant_salt="testsalt", is_active=True,
        )
        self.profile = make_profile(gender=Gender.MALE)
        self.plan = MembershipPlan.objects.get(slug="gold")

    def _signed_success(self):
        txn = PaymentTransaction.objects.create(
            profile=self.profile, plan=self.plan, amount=self.plan.price_inr,
            product_info=self.plan.name, first_name="Ravi", email="ravi@example.com",
        )
        import hashlib
        raw = "testsalt|success||||||" + "|".join([
            "", "", "", "", "",
            "ravi@example.com", "Ravi", self.plan.name,
            f"{self.plan.price_inr:.2f}", txn.txnid, "testkey",
        ])
        return txn, {
            "status": "success", "txnid": txn.txnid,
            "amount": f"{self.plan.price_inr:.2f}", "productinfo": self.plan.name,
            "firstname": "Ravi", "email": "ravi@example.com",
            "hash": hashlib.sha512(raw.encode()).hexdigest().lower(),
        }

    def test_successful_return_activates_and_redirects(self):
        txn, payload = self._signed_success()
        resp = self.client.post("/api/v1/payments/payu/return/", payload)
        self.assertEqual(resp.status_code, 302)
        self.assertIn("/payment/result", resp["Location"])
        txn.refresh_from_db()
        self.assertEqual(txn.status, PaymentTransaction.Status.SUCCESS)
        self.assertTrue(
            Subscription.objects.filter(
                profile=self.profile, status=Subscription.Status.ACTIVE
            ).exists()
        )

    def test_return_is_not_throttled(self):
        for _ in range(3):
            txn, payload = self._signed_success()
            resp = self.client.post("/api/v1/payments/payu/return/", payload)
            self.assertEqual(resp.status_code, 302)


class PayUDisabledTests(ApiTestCase):
    def test_payu_endpoints_are_gone_when_disabled(self):
        for path in ("initiate", "return", "webhook"):
            resp = self.client.post(f"/api/v1/payments/payu/{path}/", {})
            self.assertEqual(resp.status_code, 404, path)
