from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework import status

from apps.accounts import tokens
from apps.testing import ApiTestCase

User = get_user_model()


class AuthFlowTests(ApiTestCase):
    def test_register_sends_verification_email(self):
        resp = self.client.post("/api/v1/auth/register/", {
            "email": "New.Person@Example.com", "password": "very-strong-pw-42",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="new.person@example.com")
        self.assertFalse(user.email_verified)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("verify-email?token=", mail.outbox[0].body)

    def test_email_verification_roundtrip(self):
        user = User.objects.create_user(email="v@example.com", password="pw-strong-123")
        token = tokens.make_email_token(user)
        resp = self.client.post("/api/v1/auth/email/verify/", {"token": token}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.email_verified)

    def test_login_returns_user_payload(self):
        User.objects.create_user(email="l@example.com", password="pw-strong-123")
        resp = self.client.post("/api/v1/auth/login/", {
            "email": "l@example.com", "password": "pw-strong-123",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.data)
        self.assertEqual(resp.data["user"]["email"], "l@example.com")

    def test_password_reset_works_for_legacy_unusable_password(self):
        user = User.objects.create_user(email="legacy@example.com", password=None)
        user.set_unusable_password()
        user.must_reset_password = True
        user.save()

        self.client.post("/api/v1/auth/password/reset/",
                         {"email": "legacy@example.com"}, format="json")
        self.assertEqual(len(mail.outbox), 1)

        uid, token = tokens.make_password_reset_token(user)
        resp = self.client.post("/api/v1/auth/password/reset/confirm/", {
            "uid": uid, "token": token, "new_password": "brand-new-pw-77",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.check_password("brand-new-pw-77"))
        self.assertTrue(user.email_verified)
        self.assertFalse(user.must_reset_password)

    def test_password_reset_never_reveals_unknown_email(self):
        resp = self.client.post("/api/v1/auth/password/reset/",
                                {"email": "nobody@example.com"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)


class AuthThrottleTests(ApiTestCase):
    def test_login_is_throttled_past_the_auth_rate(self):
        # DEFAULT_THROTTLE_RATES["auth"] is 20/min.
        codes = [
            self.client.post("/api/v1/auth/login/",
                             {"email": "x@example.com", "password": "bad"},
                             format="json").status_code
            for _ in range(25)
        ]
        self.assertEqual(codes[0], status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(codes[-1], status.HTTP_429_TOO_MANY_REQUESTS)
