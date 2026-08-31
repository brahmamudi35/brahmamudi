from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import status

from apps.profiles.models import HoroscopeDocument
from apps.reference.enums import Gender
from apps.testing import ApiTestCase, give_subscription, make_profile, make_user

_PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"


def _pdf():
    return SimpleUploadedFile("jataka.pdf", _PDF, content_type="application/pdf")


def _img():
    buf = BytesIO()
    Image.new("RGB", (2200, 1400), "white").save(buf, format="PNG")
    return SimpleUploadedFile("chart.png", buf.getvalue(), content_type="image/png")


class HoroscopeUploadTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.me = make_profile(gender=Gender.MALE)
        self.client.force_authenticate(self.me.user)

    def _post(self, f):
        return self.client.post("/api/v1/profiles/me/horoscope/", {"file": f},
                                format="multipart")

    def test_upload_pdf(self):
        r = self._post(_pdf())
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        doc = HoroscopeDocument.objects.get(profile=self.me)
        self.assertTrue(doc.is_pdf)
        self.assertEqual(doc.original_name, "jataka.pdf")

    def test_upload_image_is_downscaled_to_jpeg(self):
        r = self._post(_img())
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        doc = HoroscopeDocument.objects.get(profile=self.me)
        self.assertFalse(doc.is_pdf)
        self.assertTrue(doc.file.name.endswith(".jpg"))

    def test_reupload_replaces(self):
        self._post(_pdf())
        self._post(_img())
        self.assertEqual(HoroscopeDocument.objects.filter(profile=self.me).count(), 1)

    def test_reject_non_document(self):
        bad = SimpleUploadedFile("notes.txt", b"hello", content_type="text/plain")
        self.assertEqual(self._post(bad).status_code, status.HTTP_400_BAD_REQUEST)

    def test_fake_pdf_rejected(self):
        bad = SimpleUploadedFile("x.pdf", b"not a pdf", content_type="application/pdf")
        self.assertEqual(self._post(bad).status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_and_delete(self):
        self._post(_pdf())
        self.assertEqual(
            self.client.get("/api/v1/profiles/me/horoscope/").status_code, 200
        )
        self.assertEqual(
            self.client.delete("/api/v1/profiles/me/horoscope/").status_code, 204
        )
        self.assertFalse(HoroscopeDocument.objects.filter(profile=self.me).exists())

    def test_unverified_cannot_upload(self):
        u = make_profile(gender=Gender.FEMALE, user=make_user(email_verified=False))
        self.client.force_authenticate(u.user)
        self.assertEqual(self._post(_pdf()).status_code, status.HTTP_403_FORBIDDEN)


class HoroscopeVisibilityTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.her = make_profile(gender=Gender.FEMALE, contact_phone="9")
        HoroscopeDocument.objects.create(
            profile=self.her, file=_pdf(), is_pdf=True, is_approved=True,
        )
        self.him = make_profile(gender=Gender.MALE)

    def _horoscope(self, tok_profile):
        self.client.force_authenticate(tok_profile.user)
        return self.client.get(f"/api/v1/profiles/{self.her.pk}/").data["horoscope"]

    def test_locked_until_contact_unlocked(self):
        h = self._horoscope(self.him)
        self.assertTrue(h["locked"])
        self.assertIsNone(h["url"])

        give_subscription(self.him, "gold")
        self.client.post(f"/api/v1/profiles/{self.her.pk}/unlock-contact/")
        h = self.client.get(f"/api/v1/profiles/{self.her.pk}/").data["horoscope"]
        self.assertFalse(h["locked"])
        self.assertTrue(h["url"])

    def test_owner_always_sees_own(self):
        self.client.force_authenticate(self.her.user)
        h = self.client.get("/api/v1/profiles/me/").data["horoscope"]
        self.assertFalse(h["locked"])
        self.assertEqual(h["status"], "approved")
        self.assertTrue(h["url"])


class HoroscopeModerationTests(ApiTestCase):
    def test_queue_approve_reject(self):
        owner = make_profile(gender=Gender.MALE)
        d1 = HoroscopeDocument.objects.create(profile=owner, file=_pdf(), is_approved=False)
        owner2 = make_profile(gender=Gender.FEMALE)
        d2 = HoroscopeDocument.objects.create(profile=owner2, file=_pdf(), is_approved=False)

        self.client.force_authenticate(make_user(is_staff=True))
        pending = self.client.get("/api/v1/moderation/horoscopes/?filter=pending")
        self.assertEqual({r["id"] for r in pending.data["results"]}, {d1.pk, d2.pk})

        self.client.post(f"/api/v1/moderation/horoscopes/{d1.pk}/approve/")
        d1.refresh_from_db()
        self.assertTrue(d1.is_approved)

        self.client.delete(f"/api/v1/moderation/horoscopes/{d2.pk}/")
        self.assertFalse(HoroscopeDocument.objects.filter(pk=d2.pk).exists())

        summary = self.client.get("/api/v1/moderation/summary/").data
        self.assertIn("pending_horoscopes", summary)
