from django.test import SimpleTestCase

from apps.profiles import porutham


class _Nak:
    def __init__(self, order, gana="", nadi=""):
        self.order, self.gana, self.nadi = order, gana, nadi


class _Raasi:
    def __init__(self, order, lord=""):
        self.order, self.lord = order, lord


class _Profile:
    def __init__(self, nak=None, raasi=None):
        self.nakshatram, self.raasi = nak, raasi


def _check(result, key):
    return next(c for c in result["checks"] if c["key"] == key)


class PoruthamTests(SimpleTestCase):
    def test_missing_stars_are_ungraded_not_failed(self):
        r = porutham.compute(_Profile(), _Profile())
        self.assertEqual(r["verdict"], "unknown")
        self.assertEqual(r["graded"], 0)
        self.assertTrue(all(c["ok"] is None for c in r["checks"]))

    def test_same_nadi_is_dosha_and_blocks_the_match(self):
        bride = _Profile(_Nak(4, "manushya", "antya"), _Raasi(2, "Venus"))
        groom = _Profile(_Nak(15, "deva", "antya"), _Raasi(7, "Venus"))
        r = porutham.compute(bride, groom)
        self.assertTrue(r["nadi_dosha"])
        self.assertFalse(_check(r, "nadi")["ok"])
        self.assertEqual(r["verdict"], "not_recommended")

    def test_same_rajju_group_fails_rajju(self):
        # Rohini(4) and Ardra(6) are both in the 'kantha' rajju group.
        bride = _Profile(_Nak(4, "manushya", "aadi"))
        groom = _Profile(_Nak(6, "manushya", "madhya"))
        r = porutham.compute(bride, groom)
        self.assertFalse(_check(r, "rajju")["ok"])
        self.assertIn("Rajju", r["vital_failed"])

    def test_vedha_pair_fails_vedha(self):
        # Ashwini(1) <-> Jyeshtha(18) are a vedha pair.
        r = porutham.compute(_Profile(_Nak(1, "deva", "aadi")),
                             _Profile(_Nak(18, "rakshasa", "madhya")))
        self.assertFalse(_check(r, "vedha")["ok"])

    def test_reasonable_match_passes_every_vital_porutham(self):
        # Bharani(2)/Punarvasu(7): different nadi + rajju, no vedha, 5-9 signs.
        bride = _Profile(_Nak(2, "manushya", "madhya"), _Raasi(2, "Venus"))
        groom = _Profile(_Nak(7, "deva", "aadi"), _Raasi(6, "Mercury"))
        r = porutham.compute(bride, groom)
        self.assertEqual(r["vital_failed"], [])
        self.assertFalse(r["nadi_dosha"])
        self.assertIn(r["verdict"], {"excellent", "acceptable"})
        self.assertLessEqual(r["score"], r["max_score"])

    def test_count_wraps_around_the_wheel(self):
        self.assertEqual(porutham._count(25, 3, 27), 6)
        self.assertEqual(porutham._count(1, 1, 27), 1)
        self.assertEqual(porutham._count(12, 3, 12), 4)
