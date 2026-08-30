"""South-Indian ten-porutham (nakshatra compatibility) scoring.

Computes the classic Telugu / Tamil match check between a bride and a groom
from their birth star (nakshatram, 1-27) and moon sign (raasi, 1-12), using
the attributes already seeded on ``reference.Nakshatram`` / ``reference.Raasi``
(gana, yoni, nadi, planetary lord).

Each porutham returns ``{key, label, ok, score, max, note}``; ``compute()``
bundles them with a headline verdict. Missing data yields ``ok=None`` for the
affected checks rather than a hard failure.

This is a compatibility *aid*, not a substitute for an astrologer.
"""

from __future__ import annotations

from dataclasses import dataclass

# --- static reference tables (keyed by nakshatram / raasi order) -------------

# Rajju group for each nakshatram (same group between partners = dosha).
_RAJJU = {
    "paada": {1, 9, 10, 18, 19, 27},   # foot  (mildest)
    "kati": {2, 8, 11, 17, 20, 26},    # waist
    "naabhi": {3, 7, 12, 16, 21, 25},  # navel
    "kantha": {4, 6, 13, 15, 22, 24},  # neck
    "siro": {5, 14, 23},               # head  (severest)
}
_RAJJU_SEVERITY = {"paada": "mild", "kati": "moderate", "naabhi": "moderate",
                   "kantha": "serious", "siro": "severe"}

# Mutual vedha (affliction) pairs of nakshatrams.
_VEDHA_PAIRS = [
    (1, 18), (2, 17), (3, 16), (4, 15), (5, 23), (6, 22), (7, 21), (8, 20),
    (9, 19), (10, 27), (11, 26), (12, 25), (13, 24),
]
_VEDHA = {a: b for a, b in _VEDHA_PAIRS}
_VEDHA.update({b: a for a, b in _VEDHA_PAIRS})

# Mahendra: girl->boy nakshatra counts that favour progeny / wellbeing.
_MAHENDRA_COUNTS = {4, 7, 10, 13, 16, 19, 22, 25}

# Yoni (sexual-temperament) animal per nakshatram, and the sworn-enemy pairs.
_YONI = {
    1: "horse", 2: "elephant", 3: "sheep", 4: "serpent", 5: "serpent",
    6: "dog", 7: "cat", 8: "sheep", 9: "cat", 10: "rat", 11: "rat",
    12: "cow", 13: "buffalo", 14: "tiger", 15: "buffalo", 16: "tiger",
    17: "deer", 18: "deer", 19: "dog", 20: "monkey", 21: "mongoose",
    22: "monkey", 23: "lion", 24: "horse", 25: "lion", 26: "cow", 27: "elephant",
}
_YONI_ENEMIES = {
    frozenset(("cow", "tiger")), frozenset(("elephant", "lion")),
    frozenset(("horse", "buffalo")), frozenset(("dog", "deer")),
    frozenset(("serpent", "mongoose")), frozenset(("cat", "rat")),
    frozenset(("sheep", "monkey")),
}

# Gana score matrix: (groom_gana, bride_gana) -> points out of 6.
_GANA_MATRIX = {
    ("deva", "deva"): 6, ("deva", "manushya"): 6, ("deva", "rakshasa"): 5,
    ("manushya", "deva"): 5, ("manushya", "manushya"): 6, ("manushya", "rakshasa"): 0,
    ("rakshasa", "deva"): 1, ("rakshasa", "manushya"): 3, ("rakshasa", "rakshasa"): 6,
}

# Planetary friendship for Graha-Maitri (raasi-lord relationship).
_PLANET_FRIENDS = {
    "Sun": {"Moon", "Mars", "Jupiter"},
    "Moon": {"Sun", "Mercury"},
    "Mars": {"Sun", "Moon", "Jupiter"},
    "Mercury": {"Sun", "Venus"},
    "Jupiter": {"Sun", "Moon", "Mars"},
    "Venus": {"Mercury", "Saturn"},
    "Saturn": {"Mercury", "Venus"},
}
_PLANET_ENEMIES = {
    "Sun": {"Venus", "Saturn"},
    "Moon": set(),
    "Mars": {"Mercury"},
    "Mercury": {"Moon"},
    "Jupiter": {"Mercury", "Venus"},
    "Venus": {"Sun", "Moon"},
    "Saturn": {"Sun", "Moon", "Mars"},
}

# Vasya: raasis controlled by each raasi (order -> set of orders).
_VASYA = {
    1: {5, 8}, 2: {4, 7}, 3: {6}, 4: {8, 9}, 5: {7, 10}, 6: {3, 12},
    7: {6, 10}, 8: {4}, 9: {12}, 10: {11, 1}, 11: {1}, 12: {10},
}


def _count(from_order: int, to_order: int, modulus: int) -> int:
    """Inclusive forward count from one order to another around a wheel."""
    return (to_order - from_order) % modulus + 1


def _rajju_group(order: int) -> str | None:
    for name, members in _RAJJU.items():
        if order in members:
            return name
    return None


def _planet_relation(a: str, b: str) -> str:
    if a == b:
        return "friend"
    if b in _PLANET_FRIENDS.get(a, set()) and a in _PLANET_FRIENDS.get(b, set()):
        return "friend"
    if b in _PLANET_ENEMIES.get(a, set()) and a in _PLANET_ENEMIES.get(b, set()):
        return "enemy"
    if b in _PLANET_FRIENDS.get(a, set()) or a in _PLANET_FRIENDS.get(b, set()):
        return "friend-neutral"
    if b in _PLANET_ENEMIES.get(a, set()) or a in _PLANET_ENEMIES.get(b, set()):
        return "enemy-neutral"
    return "neutral"


@dataclass
class _Star:
    nak: int | None
    gana: str
    yoni: str
    nadi: str
    raasi: int | None
    raasi_lord: str


def _star_from_profile(profile) -> _Star:
    nak = getattr(profile, "nakshatram", None)
    raasi = getattr(profile, "raasi", None)
    return _Star(
        nak=nak.order if nak else None,
        gana=(nak.gana if nak else "") or "",
        yoni=_YONI.get(nak.order, "") if nak else "",
        nadi=(nak.nadi if nak else "") or "",
        raasi=raasi.order if raasi else None,
        raasi_lord=(raasi.lord if raasi else "") or "",
    )


def _result(key, label, ok, score, mx, note):
    return {"key": key, "label": label, "ok": ok, "score": score, "max": mx, "note": note}


def _dina(bride: _Star, groom: _Star):
    if bride.nak is None or groom.nak is None:
        return _result("dina", "Dina", None, 0, 3, "Birth star missing.")
    rem = _count(bride.nak, groom.nak, 27) % 9
    ok = rem in {0, 2, 4, 6, 8}
    return _result("dina", "Dina", ok, 3 if ok else 0, 3,
                   "Health and longevity of the union." if ok
                   else "Star count is inauspicious; caution advised.")


def _gana(bride: _Star, groom: _Star):
    if not bride.gana or not groom.gana:
        return _result("gana", "Gana", None, 0, 6, "Gana not known.")
    pts = _GANA_MATRIX.get((groom.gana, bride.gana), 0)
    ok = pts >= 5
    return _result("gana", "Gana", ok, pts, 6,
                   f"Temperament match ({groom.gana.title()} groom / "
                   f"{bride.gana.title()} bride).")


def _mahendra(bride: _Star, groom: _Star):
    if bride.nak is None or groom.nak is None:
        return _result("mahendra", "Mahendra", None, 0, 1, "Birth star missing.")
    ok = _count(bride.nak, groom.nak, 27) in _MAHENDRA_COUNTS
    return _result("mahendra", "Mahendra", ok, 1 if ok else 0, 1,
                   "Favours progeny and prosperity." if ok
                   else "Mahendra count not met.")


def _stree_deergha(bride: _Star, groom: _Star):
    if bride.nak is None or groom.nak is None:
        return _result("stree_deergha", "Stree Deergha", None, 0, 2, "Birth star missing.")
    count = _count(bride.nak, groom.nak, 27)
    if count >= 14:
        return _result("stree_deergha", "Stree Deergha", True, 2, 2,
                       "Strongly favours the bride's wellbeing.")
    if count >= 8:
        return _result("stree_deergha", "Stree Deergha", True, 1, 2,
                       "Moderately favours the bride's wellbeing.")
    return _result("stree_deergha", "Stree Deergha", False, 0, 2,
                   "Groom's star too close after the bride's.")


def _yoni(bride: _Star, groom: _Star):
    if not bride.yoni or not groom.yoni:
        return _result("yoni", "Yoni", None, 0, 4, "Yoni not known.")
    if bride.yoni == groom.yoni:
        return _result("yoni", "Yoni", True, 4, 4, "Same yoni - excellent intimacy match.")
    if frozenset((bride.yoni, groom.yoni)) in _YONI_ENEMIES:
        return _result("yoni", "Yoni", False, 0, 4,
                       f"{groom.yoni.title()} and {bride.yoni.title()} are hostile yonis.")
    return _result("yoni", "Yoni", True, 2, 4,
                   f"{groom.yoni.title()} / {bride.yoni.title()} - workable.")


def _raasi(bride: _Star, groom: _Star):
    if bride.raasi is None or groom.raasi is None:
        return _result("raasi", "Raasi", None, 0, 5, "Moon sign missing.")
    fwd = _count(bride.raasi, groom.raasi, 12)   # bride -> groom
    rev = _count(groom.raasi, bride.raasi, 12)   # groom -> bride
    pair = {fwd, rev}
    if pair == {2, 12}:
        return _result("raasi", "Raasi", False, 0, 5, "Dwirdwadasha dosha (2-12).")
    if pair == {6, 8}:
        return _result("raasi", "Raasi", False, 0, 5, "Shashtashtaka dosha (6-8).")
    if pair == {5, 9}:
        return _result("raasi", "Raasi", True, 3, 5, "5-9 - acceptable with counsel.")
    return _result("raasi", "Raasi", True, 5, 5, "Signs are mutually supportive.")


def _nadi(bride: _Star, groom: _Star):
    if not bride.nadi or not groom.nadi:
        return _result("nadi", "Nadi", None, 0, 8, "Nadi not known.")
    ok = bride.nadi != groom.nadi
    return _result("nadi", "Nadi", ok, 8 if ok else 0, 8,
                   "Different nadi - healthy progeny indication." if ok
                   else f"Same nadi ({bride.nadi}) - Nadi dosha, the gravest flaw.")


def _graha_maitri(bride: _Star, groom: _Star):
    if not bride.raasi_lord or not groom.raasi_lord:
        return _result("graha_maitri", "Graha Maitri", None, 0, 5, "Sign lord not known.")
    rel = _planet_relation(groom.raasi_lord, bride.raasi_lord)
    pts = {"friend": 5, "friend-neutral": 4, "neutral": 3,
           "enemy-neutral": 1, "enemy": 0}[rel]
    ok = pts >= 3
    return _result("graha_maitri", "Graha Maitri", ok, pts, 5,
                   f"{groom.raasi_lord} and {bride.raasi_lord} are {rel.replace('-', ' / ')}.")


def _vasya(bride: _Star, groom: _Star):
    if bride.raasi is None or groom.raasi is None:
        return _result("vasya", "Vasya", None, 0, 2, "Moon sign missing.")
    ok = groom.raasi in _VASYA.get(bride.raasi, set()) or \
        bride.raasi in _VASYA.get(groom.raasi, set())
    return _result("vasya", "Vasya", ok, 2 if ok else 0, 2,
                   "Natural mutual attraction." if ok else "No vasya pull.")


def _rajju(bride: _Star, groom: _Star):
    if bride.nak is None or groom.nak is None:
        return _result("rajju", "Rajju", None, 0, 4, "Birth star missing.")
    gb, gg = _rajju_group(bride.nak), _rajju_group(groom.nak)
    if gb and gb == gg:
        return _result("rajju", "Rajju", False, 0, 4,
                       f"Same {gb} rajju - {_RAJJU_SEVERITY[gb]} dosha.")
    return _result("rajju", "Rajju", True, 4, 4, "Different rajju - the vital check passes.")


def _vedha(bride: _Star, groom: _Star):
    if bride.nak is None or groom.nak is None:
        return _result("vedha", "Vedha", None, 0, 2, "Birth star missing.")
    ok = _VEDHA.get(bride.nak) != groom.nak
    return _result("vedha", "Vedha", ok, 2 if ok else 0, 2,
                   "No mutual affliction." if ok else "The stars afflict each other.")


_CHECKS = (_dina, _gana, _mahendra, _stree_deergha, _yoni,
           _raasi, _graha_maitri, _vasya, _rajju, _vedha, _nadi)

# Checks that traditionally must pass for the alliance to be considered.
_VITAL = {"dina", "gana", "yoni", "raasi", "rajju", "nadi"}


def compute(bride_profile, groom_profile) -> dict:
    bride, groom = _star_from_profile(bride_profile), _star_from_profile(groom_profile)
    checks = [fn(bride, groom) for fn in _CHECKS]

    graded = [c for c in checks if c["ok"] is not None]
    passed = sum(1 for c in graded if c["ok"])
    score = sum(c["score"] for c in graded)
    max_score = sum(c["max"] for c in graded)
    vital_failed = [c["label"] for c in checks if c["key"] in _VITAL and c["ok"] is False]

    nadi_dosha = next((c["ok"] is False for c in checks if c["key"] == "nadi"), False)

    pct = round(100 * score / max_score) if max_score else None
    if not graded:
        verdict, summary = "unknown", "Add birth-star details to both profiles to see compatibility."
    elif vital_failed:
        verdict = "not_recommended"
        summary = f"A key porutham does not agree ({', '.join(vital_failed)})."
    elif passed >= max(6, len(graded) - 2):
        verdict, summary = "excellent", "Strong overall agreement across the poruthams."
    elif passed >= len(graded) // 2:
        verdict, summary = "acceptable", "A workable match; review the weaker poruthams."
    else:
        verdict, summary = "poor", "Few poruthams agree; proceed only with astrologer counsel."

    return {
        "verdict": verdict,
        "summary": summary,
        "passed": passed,
        "graded": len(graded),
        "score": score,
        "max_score": max_score,
        "percent": pct,
        "nadi_dosha": nadi_dosha,
        "vital_failed": vital_failed,
        "checks": checks,
        "bride": {"nakshatram": bride.nak, "raasi": bride.raasi},
        "groom": {"nakshatram": groom.nak, "raasi": groom.raasi},
    }
