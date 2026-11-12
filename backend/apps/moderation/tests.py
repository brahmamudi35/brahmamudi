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

    def test_profiles_are_verified_and_verify_suspend_are_gone(self):
        self.assertTrue(self.p.is_verified)
        for action in ("verify", "unverify", "suspend", "reinstate"):
            resp = self.client.post(f"/api/v1/moderation/profiles/{self.p.pk}/{action}/")
            self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND, action)

    def test_delete_removes_member_but_keeps_payments_and_log(self):
        from apps.accounts.models import User
        from apps.moderation.models import StaffAction
        from apps.profiles.models import Profile

        user_id = self.p.user_id
        txn = PaymentTransaction.objects.create(
            profile=self.p, txnid="T-DEL-1", amount=100, status=PaymentTransaction.Status.SUCCESS
        )
        resp = self.client.delete(f"/api/v1/moderation/profiles/{self.p.pk}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Profile.objects.filter(pk=self.p.pk).exists())
        self.assertFalse(User.objects.filter(pk=user_id).exists())
        txn.refresh_from_db()
        self.assertIsNone(txn.profile_id)
        entry = StaffAction.objects.get(action="delete_profile")
        self.assertEqual(entry.profile_regno, self.p.regno)
        self.assertEqual(entry.data["name"], self.p.full_name)

    def test_staff_account_cannot_be_deleted_here(self):
        staff_profile = make_profile(gender=Gender.MALE, user=make_user(is_staff=True))
        resp = self.client.delete(f"/api/v1/moderation/profiles/{staff_profile.pk}/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_members_cannot_delete(self):
        self.client.force_authenticate(make_profile(gender=Gender.MALE).user)
        resp = self.client.delete(f"/api/v1/moderation/profiles/{self.p.pk}/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_summary_counts(self):
        data = self.client.get("/api/v1/moderation/summary/").data
        self.assertGreaterEqual(data["total_members"], 1)
        self.assertNotIn("unverified_profiles", data)


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
