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


class ModerationDirectoryFilterTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        from datetime import date

        from apps.testing import give_subscription

        self.client.force_authenticate(make_user(is_staff=True))
        self.young_m = make_profile(gender=Gender.MALE, first_name="Arjun",
                                    date_of_birth=date(2001, 1, 1))
        self.gold_f = make_profile(gender=Gender.FEMALE, first_name="Meena",
                                   date_of_birth=date(1990, 1, 1),
                                   occupation="Architect")
        give_subscription(self.gold_f, "gold")

    def _ids(self, query):
        return {r["id"] for r in
                self.client.get(f"/api/v1/moderation/profiles/?{query}").data["results"]}

    def test_gender_and_age_filters(self):
        self.assertEqual(self._ids("filter=all&gender=M"), {self.young_m.pk})
        self.assertIn(self.young_m.pk, self._ids("filter=all&age_max=27"))
        self.assertNotIn(self.gold_f.pk, self._ids("filter=all&age_max=27"))

    def test_plan_filter(self):
        self.assertEqual(self._ids("filter=all&plan=gold"), {self.gold_f.pk})
        self.assertIn(self.young_m.pk, self._ids("filter=all&plan=none"))

    def test_subcaste_accepts_multiple_values(self):
        from apps.reference.enums import SubCaste

        gold = make_profile(gender=Gender.MALE, subcaste=SubCaste.GOLDSMITH)
        carp = make_profile(gender=Gender.MALE, subcaste=SubCaste.CARPENTER)
        black = make_profile(gender=Gender.MALE, subcaste=SubCaste.BLACKSMITH)
        ids = self._ids(
            f"filter=all&subcaste={SubCaste.GOLDSMITH}&subcaste={SubCaste.CARPENTER}"
        )
        self.assertIn(gold.pk, ids)
        self.assertIn(carp.pk, ids)
        self.assertNotIn(black.pk, ids)

    def test_search(self):
        self.assertEqual(self._ids("filter=all&search=Architect"), {self.gold_f.pk})
        self.assertEqual(self._ids(f"filter=all&search={self.young_m.regno}"),
                         {self.young_m.pk})

    def test_serializer_exposes_plan_and_contact(self):
        row = next(r for r in
                   self.client.get("/api/v1/moderation/profiles/?filter=all").data["results"]
                   if r["id"] == self.gold_f.pk)
        self.assertEqual(row["plan"], "Gold")
        self.assertIn("phone", row)
        self.assertIn("region", row)


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
