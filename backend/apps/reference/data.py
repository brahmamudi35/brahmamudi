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
# legacy_code mirrors tbl_profiles.Edu_code; 0 = unspecified.
EDUCATION_LEVELS = [
    ("Not specified", "other", 0, 0),
    ("High School", "school", 1, 10),
    ("Higher Secondary", "school", 2, 20),
    ("Diploma", "diploma", 3, 30),
    ("Bachelors - Arts", "bachelors", 4, 40),
    ("Bachelors - Commerce", "bachelors", 5, 41),
    ("Bachelors - Science", "bachelors", 6, 42),
    ("Bachelors - Engineering / Computers", "bachelors", 7, 43),
    ("Bachelors - Medicine", "bachelors", 8, 44),
    ("Bachelors - Law", "bachelors", 9, 45),
    ("Bachelors - Management", "bachelors", 10, 46),
    ("Bachelors - Other", "bachelors", 11, 47),
    ("Masters - Arts", "masters", 12, 50),
    ("Masters - Science", "masters", 13, 51),
    ("Masters - Engineering / Computers", "masters", 14, 52),
    ("Masters - Commerce", "masters", 15, 53),
    ("Masters - Management (MBA)", "masters", 16, 54),
    ("Masters - Medicine", "masters", 17, 55),
    ("Masters - Other", "masters", 18, 56),
    ("Doctorate (PhD / MD)", "doctorate", 19, 60),
    ("Post Doctorate", "doctorate", 20, 61),
]

# name, slug, duration_months, price, contact_views, interests_per_day, sort
MEMBERSHIP_PLANS = [
    ("Free", "free", 0, 0, 0, 5, 0),
    ("Silver", "silver", 6, 1500, 25, 25, 1),
    ("Gold", "gold", 12, 2500, 75, 50, 2),
    ("Platinum", "platinum", 12, 3500, None, None, 3),
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
