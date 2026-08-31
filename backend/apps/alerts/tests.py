from datetime import date

from django.core import mail
from django.core.management import call_command
from io import StringIO
from rest_framework import status

from apps.alerts.models import SavedSearch
from apps.notifications.models import Notification
from apps.reference.enums import Gender, SubCaste
from apps.testing import ApiTestCase, make_profile


class SavedSearchApiTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.me = make_profile(gender=Gender.MALE, subcaste=SubCaste.GOLDSMITH)
        self.client.force_authenticate(self.me.user)

    def test_create_sets_baseline_and_lists_with_count(self):
        make_profile(gender=Gender.FEMALE, subcaste=SubCaste.GOLDSMITH,
                     date_of_birth=date(1996, 1, 1))
        make_profile(gender=Gender.FEMALE, subcaste=SubCaste.CARPENTER)

        resp = self.client.post("/api/v1/saved-searches/", {
            "name": "Goldsmith brides",
            "filters": {"subcaste": [SubCaste.GOLDSMITH]},
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        saved = SavedSearch.objects.get()
        self.assertGreater(saved.last_seen_id, 0)  # baseline captured

        listing = self.client.get("/api/v1/saved-searches/").data
        self.assertEqual(listing[0]["match_count"], 1)

    def test_results_endpoint_runs_the_filter(self):
        good = make_profile(gender=Gender.FEMALE, subcaste=SubCaste.GOLDSMITH)
        make_profile(gender=Gender.FEMALE, subcaste=SubCaste.BLACKSMITH)
        saved = SavedSearch.objects.create(
            owner=self.me, name="x", filters={"subcaste": [SubCaste.GOLDSMITH]},
        )
        rows = self.client.get(f"/api/v1/saved-searches/{saved.pk}/results/").data
        self.assertEqual([r["id"] for r in rows["results"]], [good.pk])

    def test_scoped_to_owner(self):
        other = make_profile(gender=Gender.MALE)
        SavedSearch.objects.create(owner=other, name="theirs", filters={})
        self.assertEqual(len(self.client.get("/api/v1/saved-searches/").data), 0)


class SearchAlertCommandTests(ApiTestCase):
    def test_alert_fires_for_new_matches_then_stops(self):
        me = make_profile(gender=Gender.MALE, subcaste=SubCaste.GOLDSMITH)
        make_profile(gender=Gender.FEMALE, subcaste=SubCaste.GOLDSMITH)  # pre-existing

        self.client.force_authenticate(me.user)
        self.client.post("/api/v1/saved-searches/", {
            "name": "Goldsmith", "filters": {"subcaste": [SubCaste.GOLDSMITH]},
        }, format="json")
        mail.outbox.clear()

        # nothing new yet
        call_command("send_search_alerts", stdout=StringIO())
        self.assertEqual(len(mail.outbox), 0)

        # a new matching bride joins
        fresh = make_profile(gender=Gender.FEMALE, subcaste=SubCaste.GOLDSMITH)

        call_command("send_search_alerts", stdout=StringIO())
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Goldsmith", mail.outbox[0].subject)
        self.assertTrue(
            Notification.objects.filter(recipient=me, kind="search_alert").exists()
        )
        saved = SavedSearch.objects.get(owner=me)
        self.assertEqual(saved.last_seen_id, fresh.pk)

        # re-run: already delivered
        mail.outbox.clear()
        call_command("send_search_alerts", stdout=StringIO())
        self.assertEqual(len(mail.outbox), 0)

    def test_disabled_search_is_skipped(self):
        me = make_profile(gender=Gender.MALE)
        SavedSearch.objects.create(owner=me, name="off", filters={},
                                   alerts_enabled=False, last_seen_id=0)
        make_profile(gender=Gender.FEMALE)
        call_command("send_search_alerts", stdout=StringIO())
        self.assertEqual(len(mail.outbox), 0)
