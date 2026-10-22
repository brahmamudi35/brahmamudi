from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework import status

from apps.reference.enums import Gender
from apps.testing import ApiTestCase, make_profile, make_user


def _png():
    buf = BytesIO()
    Image.new("RGB", (400, 500), "green").save(buf, format="PNG")
    return SimpleUploadedFile("p.png", buf.getvalue(), content_type="image/png")


class EmailVerifiedGateTests(ApiTestCase):
    def test_unverified_cannot_create_profile(self):
        u = make_user(email_verified=False)
        self.client.force_authenticate(u)
        resp = self.client.post("/api/v1/profiles/me/", {
            "first_name": "X", "gender": Gender.MALE,
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("verify", resp.data["detail"].lower())

    def test_unverified_can_still_browse(self):
        make_profile(gender=Gender.FEMALE)
        self.client.force_authenticate(make_user(email_verified=False))
        self.assertEqual(self.client.get("/api/v1/profiles/").status_code, 200)

    def test_unverified_cannot_send_interest_or_upload_photo(self):
        her = make_profile(gender=Gender.FEMALE)
        him = make_profile(gender=Gender.MALE, user=make_user(email_verified=False))
        self.client.force_authenticate(him.user)

        r1 = self.client.post("/api/v1/interests/", {"receiver": her.pk}, format="json")
        self.assertEqual(r1.status_code, status.HTTP_403_FORBIDDEN)

        r2 = self.client.post("/api/v1/profile-photos/", {"image": _png()}, format="multipart")
        self.assertEqual(r2.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(PAYU_ENABLED=True)
    def test_unverified_cannot_start_payment(self):
        him = make_profile(gender=Gender.MALE, user=make_user(email_verified=False))
        self.client.force_authenticate(him.user)
        from apps.memberships.models import MembershipPlan

        plan = MembershipPlan.objects.get(slug="gold")
        r = self.client.post("/api/v1/payments/payu/initiate/", {"plan": plan.pk}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_verified_member_passes(self):
        him = make_profile(gender=Gender.MALE)  # make_user -> email_verified=True
        her = make_profile(gender=Gender.FEMALE)
        self.client.force_authenticate(him.user)
        r = self.client.post("/api/v1/interests/", {"receiver": her.pk}, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_staff_bypass_the_gate(self):
        staff = make_user(email_verified=False, is_staff=True)
        self.client.force_authenticate(staff)
        resp = self.client.post("/api/v1/profiles/me/", {
            "first_name": "Admin", "gender": Gender.MALE,
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    @override_settings(REQUIRE_EMAIL_VERIFICATION=False)
    def test_flag_disables_the_gate(self):
        u = make_user(email_verified=False)
        self.client.force_authenticate(u)
        resp = self.client.post("/api/v1/profiles/me/", {
            "first_name": "X", "gender": Gender.FEMALE,
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
