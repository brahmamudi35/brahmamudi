from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import status

from apps.profiles.models import ProfilePhoto
from apps.reference.enums import Gender, ProfileStatus
from apps.testing import ApiTestCase, make_profile, make_user


def _png() -> SimpleUploadedFile:
    buf = BytesIO()
    Image.new("RGB", (10, 10), "blue").save(buf, format="PNG")
    return SimpleUploadedFile("p.png", buf.getvalue(), content_type="image/png")


class ModerationAuthTests(ApiTestCase):
    def test_non_staff_is_forbidden(self):
        self.client.force_authenticate(make_user())
        for path in ("/api/v1/moderation/profiles/", "/api/v1/moderation/photos/",
                     "/api/v1/moderation/summary/"):
            self.assertEqual(self.client.get(path).status_code,
                             status.HTTP_403_FORBIDDEN, path)


class ModerationProfileTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.staff = make_user(is_staff=True)
        self.client.force_authenticate(self.staff)
        self.p = make_profile(gender=Gender.FEMALE)

    def test_unverified_filter_and_verify_action(self):
        listing = self.client.get("/api/v1/moderation/profiles/?filter=unverified")
        self.assertIn(self.p.pk, [r["id"] for r in listing.data["results"]])

        resp = self.client.post(f"/api/v1/moderation/profiles/{self.p.pk}/verify/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.p.refresh_from_db()
        self.assertTrue(self.p.is_verified)

        # now gone from the unverified queue, still reachable for detail actions
        listing = self.client.get("/api/v1/moderation/profiles/?filter=unverified")
        self.assertNotIn(self.p.pk, [r["id"] for r in listing.data["results"]])
        self.assertEqual(
            self.client.post(f"/api/v1/moderation/profiles/{self.p.pk}/unverify/").status_code,
            status.HTTP_200_OK,
        )

    def test_suspend_and_reinstate(self):
        self.client.post(f"/api/v1/moderation/profiles/{self.p.pk}/suspend/")
        self.p.refresh_from_db()
        self.assertEqual(self.p.status, ProfileStatus.SUSPENDED)
        self.client.post(f"/api/v1/moderation/profiles/{self.p.pk}/reinstate/")
        self.p.refresh_from_db()
        self.assertEqual(self.p.status, ProfileStatus.ACTIVE)

    def test_summary_counts(self):
        make_profile(gender=Gender.MALE, status=ProfileStatus.SUSPENDED)
        data = self.client.get("/api/v1/moderation/summary/").data
        self.assertGreaterEqual(data["unverified_profiles"], 1)
        self.assertEqual(data["suspended_profiles"], 1)


class ModerationPhotoTests(ApiTestCase):
    def test_pending_queue_approve_and_reject(self):
        owner = make_profile(gender=Gender.FEMALE)
        photo = ProfilePhoto.objects.create(profile=owner, image=_png(), is_approved=False)
        reject = ProfilePhoto.objects.create(profile=owner, image=_png(), is_approved=False)

        self.client.force_authenticate(make_user(is_staff=True))
        pending = self.client.get("/api/v1/moderation/photos/?filter=pending")
        self.assertEqual({r["id"] for r in pending.data["results"]}, {photo.pk, reject.pk})

        self.client.post(f"/api/v1/moderation/photos/{photo.pk}/approve/")
        photo.refresh_from_db()
        self.assertTrue(photo.is_approved)

        self.client.delete(f"/api/v1/moderation/photos/{reject.pk}/")
        self.assertFalse(ProfilePhoto.objects.filter(pk=reject.pk).exists())
