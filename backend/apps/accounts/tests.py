import re
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework import status

from apps.accounts.models import EmailOTP

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
        self.assertRegex(mail.outbox[0].subject, r"^\d{6} is your brahmamudi verification code")
        self.assertTrue(EmailOTP.objects.filter(user=user, purpose="verify_email").exists())

    def test_register_survives_mail_outage(self):
        with override_settings(EMAIL_BACKEND="apps.accounts.tests.BrokenBackend"):
            resp = self.client.post("/api/v1/auth/register/", {
                "email": "down@example.com", "password": "very-strong-pw-42",
            }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

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


def _code(message) -> str:
    return re.search(r"\b(\d{6})\b", message.body).group(1)


class BrokenBackend:
    def __init__(self, *a, **kw):
        pass

    def send_messages(self, messages):
        raise ConnectionError("mail down")


class OTPFlowTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(email="otp@example.com", password="pw-strong-123")

    def _request_reset(self):
        return self.client.post("/api/v1/auth/password/reset/",
                                {"email": "OTP@example.com"}, format="json")

    def _confirm(self, code, pw="brand-new-pw-77"):
        return self.client.post("/api/v1/auth/password/reset/confirm/", {
            "email": "otp@example.com", "code": code, "new_password": pw,
        }, format="json")

    def test_password_reset_with_code(self):
        self._request_reset()
        self.assertEqual(len(mail.outbox), 1)
        code = _code(mail.outbox[0])
        self.assertNotIn(code, EmailOTP.objects.get().code_hash)  # stored hashed

        resp = self._confirm(code)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("brand-new-pw-77"))
        self.assertTrue(self.user.email_verified)
        # single use
        self.assertEqual(self._confirm(code, "another-pw-88").status_code, 400)

    def test_wrong_code_counts_attempts_then_burns(self):
        self._request_reset()
        code = _code(mail.outbox[0])
        wrong = "000000" if code != "000000" else "111111"
        for left in (4, 3, 2, 1):
            resp = self._confirm(wrong)
            self.assertEqual(resp.status_code, 400)
            self.assertIn(f"{left} attempt", str(resp.data["code"]))
        self.assertIn("Too many", str(self._confirm(wrong).data["code"]))
        # even the right code is dead now
        self.assertEqual(self._confirm(code).status_code, 400)

    def test_expired_code_rejected(self):
        self._request_reset()
        code = _code(mail.outbox[0])
        EmailOTP.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self._confirm(code).status_code, 400)

    def test_resend_cooldown_then_new_code_replaces_old(self):
        self._request_reset()
        self._request_reset()
        self.assertEqual(len(mail.outbox), 1)  # within cooldown
        old = _code(mail.outbox[0])
        EmailOTP.objects.update(created_at=timezone.now() - timedelta(minutes=2))
        self._request_reset()
        self.assertEqual(len(mail.outbox), 2)
        new = _code(mail.outbox[1])
        self.assertEqual(EmailOTP.objects.count(), 1)
        if old != new:
            self.assertEqual(self._confirm(old).status_code, 400)
        self.assertEqual(self._confirm(new).status_code, 200)

    def test_reset_code_cannot_verify_email_and_vice_versa(self):
        self._request_reset()
        code = _code(mail.outbox[0])
        resp = self.client.post("/api/v1/auth/email/verify/",
                                {"email": "otp@example.com", "code": code}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_unknown_email_gets_generic_error(self):
        resp = self.client.post("/api/v1/auth/password/reset/confirm/", {
            "email": "ghost@example.com", "code": "123456", "new_password": "brand-new-pw-77",
        }, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("invalid or has expired", str(resp.data["code"]))

    def test_verify_email_with_code_signed_in(self):
        self.client.post("/api/v1/auth/email/verify/resend/",
                         {"email": "otp@example.com"}, format="json")
        code = _code(mail.outbox[0])
        self.client.force_authenticate(self.user)
        resp = self.client.post("/api/v1/auth/email/verify/", {"code": code}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.email_verified)

    def test_verify_email_with_code_and_email(self):
        self.client.post("/api/v1/auth/email/verify/resend/",
                         {"email": "otp@example.com"}, format="json")
        code = _code(mail.outbox[0])
        resp = self.client.post("/api/v1/auth/email/verify/",
                                {"email": "otp@example.com", "code": code}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


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
