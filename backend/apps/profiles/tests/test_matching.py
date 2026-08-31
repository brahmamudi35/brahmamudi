from datetime import date

from rest_framework import status

from apps.interests.models import Interest
from apps.profiles.models import PartnerPreference, Shortlist
from apps.reference.enums import FoodHabit, Gender, SubCaste
from apps.reference.models import Nakshatram
from apps.testing import ApiTestCase, make_profile


class CompletenessTests(ApiTestCase):
    def test_empty_profile_is_low_and_full_profile_is_100(self):
        bare = make_profile(gender=Gender.MALE, first_name="A", date_of_birth=None,
                            marital_status="")
        self.client.force_authenticate(bare.user)
        low = self.client.get("/api/v1/profiles/me/completeness/").data
        self.assertLess(low["percent"], 40)
        self.assertFalse(low["complete"])
        self.assertEqual(low["next"]["key"], "about")

    def test_missing_sections_point_at_onboarding_steps(self):
        p = make_profile(gender=Gender.FEMALE, marital_status="unmarried")
        self.client.force_authenticate(p.user)
        data = self.client.get("/api/v1/profiles/me/completeness/").data
        keys = {s["key"] for s in data["missing"]}
        self.assertIn("photos", keys)
        self.assertIn("preference", keys)
        self.assertTrue(all("step" in s for s in data["missing"]))


class SuggestionsTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.him = make_profile(
            gender=Gender.MALE, subcaste=SubCaste.GOLDSMITH,
            date_of_birth=date(1992, 1, 1),
        )
        PartnerPreference.objects.create(
            profile=self.him, age_min=25, age_max=34,
            subcastes=[SubCaste.GOLDSMITH], food_habits=[FoodHabit.VEGETARIAN],
        )
        self.client.force_authenticate(self.him.user)

    def test_matches_preference_and_scores(self):
        good = make_profile(
            gender=Gender.FEMALE, subcaste=SubCaste.GOLDSMITH,
            food_habit=FoodHabit.VEGETARIAN, date_of_birth=date(1996, 6, 6),
        )
        # wrong sub-caste -> filtered out entirely
        make_profile(gender=Gender.FEMALE, subcaste=SubCaste.CARPENTER,
                     date_of_birth=date(1996, 6, 6))

        rows = self.client.get("/api/v1/profiles/suggestions/").data
        ids = [r["id"] for r in rows]
        self.assertEqual(ids, [good.pk])
        match = rows[0]["match"]
        self.assertGreater(match["score"], 0)
        self.assertIn("Same sub-caste", match["reasons"])

    def test_excludes_shortlisted_and_interested(self):
        a = make_profile(gender=Gender.FEMALE, subcaste=SubCaste.GOLDSMITH,
                         date_of_birth=date(1995, 1, 1))
        b = make_profile(gender=Gender.FEMALE, subcaste=SubCaste.GOLDSMITH,
                         date_of_birth=date(1995, 1, 1))
        Shortlist.objects.create(owner=self.him, target=a)
        Interest.objects.create(sender=self.him, receiver=b)

        ids = [r["id"] for r in self.client.get("/api/v1/profiles/suggestions/").data]
        self.assertNotIn(a.pk, ids)
        self.assertNotIn(b.pk, ids)

    def test_nadi_dosha_candidate_is_dropped(self):
        antya = Nakshatram.objects.filter(nadi="antya").first()
        self.him.nakshatram = antya
        self.him.save(update_fields=["nakshatram"])
        make_profile(
            gender=Gender.FEMALE, subcaste=SubCaste.GOLDSMITH,
            date_of_birth=date(1996, 6, 6), nakshatram=antya,
        )
        rows = self.client.get("/api/v1/profiles/suggestions/").data
        self.assertEqual(rows, [])

    def test_no_profile_404(self):
        from apps.testing import make_user

        self.client.force_authenticate(make_user())
        self.assertEqual(
            self.client.get("/api/v1/profiles/suggestions/").status_code,
            status.HTTP_404_NOT_FOUND,
        )
