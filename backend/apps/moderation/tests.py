from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework import status

from apps.memberships.models import Subscription
from apps.payments.models import PaymentTransaction
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

    def test_qualification_position_and_location_filters(self):
        from apps.reference.models import EducationLevel

        masters = EducationLevel.objects.filter(category="masters").first()
        p = make_profile(
            gender=Gender.MALE, first_name="Kiran", education=masters,
            designation="Senior Data Scientist", work_location="Bengaluru",
        )
        self.assertIn(p.pk, self._ids("filter=all&education=masters"))
        self.assertNotIn(self.young_m.pk, self._ids("filter=all&education=masters"))
        self.assertEqual(self._ids("filter=all&designation=data scientist"), {p.pk})
        self.assertEqual(self._ids("filter=all&work_location=bengaluru"), {p.pk})

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


class SuperAdminGateTests(ApiTestCase):
    """The Django admin is superusers only; staff use the frontend /admin."""

    def test_staff_cannot_reach_django_admin(self):
        self.client.force_login(make_user(is_staff=True))
        resp = self.client.get(reverse("admin:index"), follow=False)
        # bounced to the admin login screen rather than shown the dashboard
        self.assertEqual(resp.status_code, 302)
        self.assertIn("login", resp["Location"])

    def test_superuser_can_reach_django_admin(self):
        self.client.force_login(make_user(is_staff=True, is_superuser=True))
        self.assertEqual(self.client.get(reverse("admin:index")).status_code, 200)


class ModerationMemberDeskTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(make_user(is_staff=True))
        self.p = make_profile(gender=Gender.FEMALE, first_name="Latha")

    def test_edit_profile_and_user_email(self):
        resp = self.client.patch(
            f"/api/v1/moderation/profiles/{self.p.pk}/",
            {"occupation": "Teacher", "user": {"email": "latha.new@example.com"}},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.p.refresh_from_db()
        self.assertEqual(self.p.occupation, "Teacher")
        self.assertEqual(self.p.user.email, "latha.new@example.com")
        self.assertIn("subscriptions", resp.data)

    def test_duplicate_email_is_rejected(self):
        make_user(email="taken@example.com")
        resp = self.client.patch(
            f"/api/v1/moderation/profiles/{self.p.pk}/",
            {"user": {"email": "taken@example.com"}}, format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_grant_plan_creates_active_subscription(self):
        resp = self.client.post(
            f"/api/v1/moderation/profiles/{self.p.pk}/grant-plan/",
            {"plan": "gold", "months": 6}, format="json",
        )
        self.assertEqual(resp.status_code, 201)
        sub = Subscription.objects.get(profile=self.p)
        self.assertEqual(sub.status, Subscription.Status.ACTIVE)
        self.assertEqual(sub.plan.slug, "gold")
        self.p.refresh_from_db()
        self.assertEqual(self.p.status, "active")

    def test_grant_plan_rejects_unknown_slug(self):
        resp = self.client.post(
            f"/api/v1/moderation/profiles/{self.p.pk}/grant-plan/",
            {"plan": "diamond"}, format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_revoke_subscription(self):
        r = self.client.post(
            f"/api/v1/moderation/profiles/{self.p.pk}/grant-plan/",
            {"plan": "silver"}, format="json",
        )
        sub_id = r.data["id"]
        resp = self.client.post(f"/api/v1/moderation/subscriptions/{sub_id}/revoke/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(
            Subscription.objects.get(pk=sub_id).status, Subscription.Status.CANCELLED
        )

    def test_payments_list_and_search(self):
        txn = PaymentTransaction.objects.create(
            profile=self.p, amount=2500, product_info="Gold",
            status=PaymentTransaction.Status.SUCCESS, email="latha@example.com",
        )
        listing = self.client.get("/api/v1/moderation/payments/?status=success")
        self.assertIn(txn.pk, [r["id"] for r in listing.data["results"]])
        by_profile = self.client.get(
            f"/api/v1/moderation/payments/?profile={self.p.pk}"
        )
        self.assertEqual([r["id"] for r in by_profile.data["results"]], [txn.pk])

    def test_summary_has_desk_counts(self):
        data = self.client.get("/api/v1/moderation/summary/").data
        for key in ("total_members", "paid_members",
                    "payments_succeeded_this_month"):
            self.assertIn(key, data)
