"""Canonical seed data for reference tables. Names follow the Telugu spellings
used in the legacy brahmamu_vbss dump; `aliases` carry common variants so the
importer can resolve messy legacy values.
"""

# order, name, aliases, lord, gana, yoni, nadi
NAKSHATRAM = [
    (1, "Ashwini", ["Aswini"], "Ketu", "deva", "Horse", "aadi"),
    (2, "Bharani", ["Bharini"], "Venus", "manushya", "Elephant", "madhya"),
    (3, "Krittika", ["Kruthika", "Karthika"], "Sun", "rakshasa", "Sheep", "antya"),
    (4, "Rohini", [], "Moon", "manushya", "Serpent", "antya"),
    (5, "Mrigashira", ["Mrugashira", "Mrigasira"], "Mars", "deva", "Serpent", "madhya"),
    (6, "Ardra", ["Aarudra", "Arudra"], "Rahu", "manushya", "Dog", "aadi"),
    (7, "Punarvasu", ["Punarvasu"], "Jupiter", "deva", "Cat", "aadi"),
    (8, "Pushyami", ["Pushya", "Pushyami"], "Saturn", "deva", "Sheep", "madhya"),
    (9, "Ashlesha", ["Aashresha", "Aslesha"], "Mercury", "rakshasa", "Cat", "antya"),
    (10, "Makha", ["Magha", "Makha"], "Ketu", "rakshasa", "Rat", "antya"),
    (11, "Pubba", ["Purva Phalguni", "Pubba"], "Venus", "manushya", "Rat", "madhya"),
    (12, "Uttara", ["Uttara Phalguni", "Uttara"], "Sun", "manushya", "Cow", "aadi"),
    (13, "Hastha", ["Hasta", "Hastha"], "Moon", "deva", "Buffalo", "aadi"),
    (14, "Chitta", ["Chitra", "Chitta"], "Mars", "rakshasa", "Tiger", "madhya"),
    (15, "Swathi", ["Swati", "Swathi"], "Rahu", "deva", "Buffalo", "antya"),
    (16, "Vishaka", ["Vishakha", "Visakha"], "Jupiter", "rakshasa", "Tiger", "antya"),
    (17, "Anuradha", [], "Saturn", "deva", "Deer", "madhya"),
    (18, "Jyeshta", ["Jyeshtha", "Jyestha"], "Mercury", "rakshasa", "Deer", "aadi"),
    (19, "Moola", ["Mula", "Moola"], "Ketu", "rakshasa", "Dog", "aadi"),
    (20, "Poorvashada", ["Purva Ashadha", "Poorvashada"], "Venus", "manushya", "Monkey", "madhya"),
    (21, "Uttaraashaada", ["Uttara Ashadha", "Uttarashada"], "Sun", "manushya", "Mongoose", "antya"),
    (22, "Shravanam", ["Shravana", "Sravanam"], "Moon", "deva", "Monkey", "antya"),
    (23, "Dhanishta", ["Dhanishta", "Sravishta"], "Mars", "rakshasa", "Lion", "madhya"),
    (24, "Shathabhisham", ["Shatabhisha", "Satabhisham"], "Rahu", "rakshasa", "Horse", "aadi"),
    (25, "Poorvabhadra", ["Purva Bhadrapada", "Poorvabhadra"], "Jupiter", "manushya", "Lion", "aadi"),
    (26, "Uttaraabhadra", ["Uttara Bhadrapada", "Uttarabhadra"], "Saturn", "manushya", "Cow", "madhya"),
    (27, "Revathi", ["Revati"], "Mercury", "deva", "Elephant", "antya"),
]

# order, name, aliases, lord, english_name
RAASI = [
    (1, "Mesham", ["Mesha"], "Mars", "Aries"),
    (2, "Vrushabam", ["Vrishabha", "Vrushabham"], "Venus", "Taurus"),
    (3, "Mithunam", ["Mithuna"], "Mercury", "Gemini"),
    (4, "Karkatakam", ["Karka", "Kataka"], "Moon", "Cancer"),
    (5, "Simham", ["Simha"], "Sun", "Leo"),
    (6, "Kanya", ["Kanni"], "Mercury", "Virgo"),
    (7, "Thula", ["Tula"], "Venus", "Libra"),
    (8, "Vrushchikam", ["Vrischika", "Vruchikam"], "Mars", "Scorpio"),
    (9, "Dhanassu", ["Dhanu", "Dhanus"], "Jupiter", "Sagittarius"),
    (10, "Makaram", ["Makara"], "Saturn", "Capricorn"),
    (11, "Kumbham", ["Kumbha"], "Saturn", "Aquarius"),
    (12, "Meenam", ["Meena"], "Jupiter", "Pisces"),
]

# name, category, legacy_code, sort_order
# The old site's qualification groups. Legacy Edu_code used 1-10 for brides
# and 11-20 for grooms (same slots, +10); see legacy_edu_code(). Slot 9 was
# left blank on the old site, and "no qualification" is simply null.
EDUCATION_LEVELS = [
    ("Group 1", "group1", 1, 1),
    ("Doctor", "doctor", 2, 2),
    ("Masters", "masters", 3, 3),
    ("Bachelors", "bachelors", 4, 4),
    ("USA & other countries", "abroad", 5, 5),
    ("CA & ICWAI", "ca_icwai", 6, 6),
    ("PG, M.Com", "pg_mcom", 7, 7),
    ("Graduate & Non Graduate", "graduate", 8, 8),
    ("Second marriage", "remarriage", 10, 10),
    # Not an old-site group; 11 is a slot legacy_edu_code never produces.
    ("Others", "other", 11, 11),
]


def legacy_edu_code(edu_code: int | None) -> int | None:
    """Fold a raw tbl_profiles.Edu_code onto its EDUCATION_LEVELS slot."""
    if not edu_code or edu_code < 0 or edu_code > 20:
        return None
    code = edu_code - 10 if edu_code > 10 else edu_code
    return None if code == 9 else code

# name, slug, duration_months, price, contact_views, interests_per_day, sort
MEMBERSHIP_PLANS = [
    ("Free", "free", 0, 0, 0, 5, 0),
    ("Silver", "silver", 6, 1450, 25, 25, 1),
    ("Gold", "gold", 12, 1950, 50, 50, 2),
    ("Platinum", "platinum", 24, 2950, None, None, 3),
]

# legacy_msgcatid, text
INTEREST_TEMPLATES = [
    (1, "Interested in your profile. Would like to know more about you. Please accept if you are interested too."),
    (2, "I feel we have a lot in common. Please go through my profile and reply to my interest."),
    (3, "My parents and I like your profile. Please send me your contact details."),
    (4, "Our children's profiles seem to match. Please accept if you want us to contact you further."),
    (5, "You are the kind of person we have been searching for. Please send us your contact details."),
    (6, "We like your profile and would like to contact your parents. Please reply to this interest."),
]

# legacy plan id -> plan slug
LEGACY_PLAN_MAP = {1: "free", 2: "silver", 3: "gold", 4: "platinum"}
