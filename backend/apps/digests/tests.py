from datetime import timedelta
from io import StringIO

from django.core import mail
from django.core.management import call_command
from django.utils import timezone

from apps.digests.services import build_digest
from apps.digests.tokens import make_unsubscribe_token
from apps.interests.models import Interest
from apps.profiles.models import ProfileView
from apps.reference.enums import Gender
from apps.testing import ApiTestCase, make_profile, make_user


def _run(**kw):
    out = StringIO()
    call_command("send_weekly_digests", stdout=out, **kw)
    return out.getvalue()


class BuildDigestTests(ApiTestCase):
    def test_returns_none_when_nothing_to_report(self):
        lonely = make_profile(gender=Gender.MALE)
        self.assertIsNone(build_digest(lonely, since=timezone.now() - timedelta(days=7)))

    def test_includes_ranked_matches(self):
        groom = make_profile(gender=Gender.MALE)
        bride = make_profile(gender=Gender.FEMALE, first_name="Sita")
        digest = build_digest(groom, since=timezone.now() - timedelta(days=7))
        self.assertIsNotNone(digest)
        self.assertIn(bride.pk, [m["profile"].pk for m in digest["matches"]])

    def test_counts_pending_interests_and_recent_visitors(self):
        me = make_profile(gender=Gender.FEMALE)
        suitor = make_profile(gender=Gender.MALE)
        Interest.objects.create(sender=suitor, receiver=me, status=Interest.Status.SENT)
        ProfileView.objects.create(viewer=suitor, viewed=me)

        digest = build_digest(me, since=timezone.now() - timedelta(days=7))
        self.assertEqual(digest["pending_interest_count"], 1)
        self.assertEqual(digest["visitor_count"], 1)

    def test_old_visits_fall_outside_the_window(self):
        me = make_profile(gender=Gender.FEMALE)
        viewer = make_profile(gender=Gender.MALE)
        view = ProfileView.objects.create(viewer=viewer, viewed=me)
        ProfileView.objects.filter(pk=view.pk).update(
            last_viewed_at=timezone.now() - timedelta(days=30)
        )
        digest = build_digest(me, since=timezone.now() - timedelta(days=7))
        # a match still exists (viewer is opposite gender) but the visit is stale
        self.assertEqual(digest["visitor_count"], 0)


class SendWeeklyDigestsCommandTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.groom = make_profile(gender=Gender.MALE)
        # a match for the groom; opted out so only the groom is mailed here
        self.bride = make_profile(gender=Gender.FEMALE)
        self.bride.user.email_digest = False
        self.bride.user.save(update_fields=["email_digest"])
        mail.outbox.clear()

    def test_sends_once_then_respects_the_weekly_guard(self):
        _run()
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(self.groom.user.email, mail.outbox[0].to)
        self.groom.user.refresh_from_db()
        self.assertIsNotNone(self.groom.user.last_digest_sent_at)

        mail.outbox.clear()
        _run()
        self.assertEqual(len(mail.outbox), 0)  # mailed too recently

        _run(force=True)
        self.assertEqual(len(mail.outbox), 1)

    def test_dry_run_sends_nothing(self):
        out = _run(dry_run=True)
        self.assertEqual(len(mail.outbox), 0)
        self.assertIn(self.groom.regno, out)

    def test_opted_out_user_is_skipped(self):
        self.groom.user.email_digest = False
        self.groom.user.save(update_fields=["email_digest"])
        _run()
        self.assertEqual(len(mail.outbox), 0)

    def test_member_with_no_activity_gets_no_email(self):
        from apps.profiles.models import Profile

        # nobody in the opposite-gender pool, no interests, no visitors
        Profile.objects.filter(gender=Gender.FEMALE).delete()
        mail.outbox.clear()
        out = _run(force=True)
        self.assertEqual(len(mail.outbox), 0)
        self.assertIn("nothing to report", out)


class UnsubscribeTests(ApiTestCase):
    def test_valid_token_opts_the_user_out(self):
        user = make_user()
        token = make_unsubscribe_token(user)
        resp = self.client.get(f"/api/v1/digests/unsubscribe/?token={token}")
        self.assertEqual(resp.status_code, 302)
        self.assertIn("digest=off", resp["Location"])
        user.refresh_from_db()
        self.assertFalse(user.email_digest)

    def test_bad_token_redirects_without_error(self):
        resp = self.client.get("/api/v1/digests/unsubscribe/?token=garbage")
        self.assertEqual(resp.status_code, 302)
        self.assertIn("digest=invalid", resp["Location"])

    def test_me_endpoint_toggles_the_preference(self):
        user = make_user()
        self.client.force_authenticate(user)
        resp = self.client.patch("/api/v1/auth/me/", {"email_digest": False}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data["email_digest"])
        user.refresh_from_db()
        self.assertFalse(user.email_digest)
