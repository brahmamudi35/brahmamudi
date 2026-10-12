from rest_framework import status

from apps.profiles.models import ContactUnlock, Profile, ProfileView
from apps.reference.enums import Gender, ProfileStatus
from apps.testing import ApiTestCase, give_subscription, make_profile, make_user


class ProfileCreateTests(ApiTestCase):
    def test_me_post_creates_a_live_profile_with_regno(self):
        user = make_user()
        self.client.force_authenticate(user)
        resp = self.client.post("/api/v1/profiles/me/", {
            "first_name": "Meera", "gender": Gender.FEMALE,
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        profile = Profile.objects.get(user=user)
        self.assertEqual(profile.status, ProfileStatus.ACTIVE)
        self.assertFalse(profile.is_verified)
        self.assertEqual(profile.regno, f"BM{profile.pk:06d}")

    def test_me_post_twice_conflicts(self):
        profile = make_profile(gender=Gender.FEMALE)
        self.client.force_authenticate(profile.user)
        resp = self.client.post("/api/v1/profiles/me/", {
            "first_name": "X", "gender": Gender.FEMALE,
        }, format="json")
        self.assertEqual(resp.status_code, 409)


class BrowseTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.him = make_profile(gender=Gender.MALE)
        self.her = make_profile(gender=Gender.FEMALE)
        make_profile(gender=Gender.MALE)  # another groom, should be hidden from him
        make_profile(gender=Gender.FEMALE, status=ProfileStatus.SUSPENDED)

    def test_browse_shows_only_active_opposite_gender(self):
        self.client.force_authenticate(self.him.user)
        resp = self.client.get("/api/v1/profiles/")
        ids = {row["id"] for row in resp.data["results"]}
        self.assertEqual(ids, {self.her.pk})

    def test_retrieve_records_a_visit(self):
        self.client.force_authenticate(self.him.user)
        self.client.get(f"/api/v1/profiles/{self.her.pk}/")
        self.client.get(f"/api/v1/profiles/{self.her.pk}/")
        view = ProfileView.objects.get(viewer=self.him, viewed=self.her)
        self.assertEqual(view.view_count, 2)

        self.client.force_authenticate(self.her.user)
        visitors = self.client.get("/api/v1/profiles/me/visitors/")
        self.assertEqual(len(visitors.data["results"]), 1)


class ContactUnlockTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.him = make_profile(gender=Gender.MALE)
        self.her = make_profile(gender=Gender.FEMALE, contact_phone="99999-00000")

    def test_contact_hidden_without_subscription_then_402_on_unlock(self):
        self.client.force_authenticate(self.him.user)
        detail = self.client.get(f"/api/v1/profiles/{self.her.pk}/")
        self.assertNotIn("contact_phone", detail.data)
        self.assertTrue(detail.data["contact_locked"])

        resp = self.client.post(f"/api/v1/profiles/{self.her.pk}/unlock-contact/")
        self.assertEqual(resp.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertEqual(resp.data["code"], "subscription_required")

    def test_unlock_with_gold_plan_reveals_contact_and_spends_quota(self):
        give_subscription(self.him, "gold")  # 50 contact views
        self.client.force_authenticate(self.him.user)
        resp = self.client.post(f"/api/v1/profiles/{self.her.pk}/unlock-contact/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["contact_phone"], "99999-00000")
        self.assertEqual(resp.data["quota"]["used"], 1)
        self.assertEqual(resp.data["quota"]["remaining"], 49)

        # unlocking again is idempotent - no extra quota spent
        self.client.post(f"/api/v1/profiles/{self.her.pk}/unlock-contact/")
        self.assertEqual(ContactUnlock.objects.filter(viewer=self.him).count(), 1)

    def test_quota_exhausted_raises_402(self):
        sub = give_subscription(self.him, "silver")  # 25 views
        sub.plan.contact_views = 1
        sub.plan.save(update_fields=["contact_views"])
        self.client.force_authenticate(self.him.user)
        first = make_profile(gender=Gender.FEMALE, contact_phone="1")
        self.client.post(f"/api/v1/profiles/{first.pk}/unlock-contact/")
        resp = self.client.post(f"/api/v1/profiles/{self.her.pk}/unlock-contact/")
        self.assertEqual(resp.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertEqual(resp.data["code"], "quota_exhausted")


class ShortlistTests(ApiTestCase):
    def test_shortlist_add_list_remove(self):
        him = make_profile(gender=Gender.MALE)
        her = make_profile(gender=Gender.FEMALE)
        self.client.force_authenticate(him.user)

        self.client.post(f"/api/v1/profiles/{her.pk}/shortlist/")
        listing = self.client.get("/api/v1/profiles/me/shortlist/")
        self.assertEqual([r["id"] for r in listing.data["results"]], [her.pk])

        self.client.delete(f"/api/v1/profiles/{her.pk}/shortlist/")
        listing = self.client.get("/api/v1/profiles/me/shortlist/")
        self.assertEqual(listing.data["results"], [])


class PoruthamEndpointTests(ApiTestCase):
    def test_requires_opposite_gender(self):
        him = make_profile(gender=Gender.MALE)
        other = make_profile(gender=Gender.MALE)
        self.client.force_authenticate(him.user)
        resp = self.client.get(f"/api/v1/profiles/{other.pk}/porutham/")
        # same-gender profiles are filtered out of the browse queryset -> 404
        self.assertIn(resp.status_code, {status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND})

    def test_returns_verdict_between_bride_and_groom(self):
        him = make_profile(gender=Gender.MALE)
        her = make_profile(gender=Gender.FEMALE)
        self.client.force_authenticate(him.user)
        resp = self.client.get(f"/api/v1/profiles/{her.pk}/porutham/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("verdict", resp.data)
        self.assertIn("checks", resp.data)
