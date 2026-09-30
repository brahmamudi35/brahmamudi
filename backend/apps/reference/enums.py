"""Fixed-choice vocabularies used across the domain.

Kept as TextChoices (not tables) because the sets are small and stable.
Nakshatram / Raasi / EducationLevel are tables instead - see models.py.

LEGACY_* dicts map codes found in the old brahmamu_vbss dump to canonical values
and are consumed by tools/legacy_import.
"""

from django.db import models


class Gender(models.TextChoices):
    MALE = "M", "Male"
    FEMALE = "F", "Female"


class MaritalStatus(models.TextChoices):
    UNMARRIED = "unmarried", "Unmarried"
    DIVORCED = "divorced", "Divorced"
    WIDOWED = "widowed", "Widowed"
    SEPARATED = "separated", "Separated"


class FoodHabit(models.TextChoices):
    VEGETARIAN = "veg", "Vegetarian"
    NON_VEGETARIAN = "nonveg", "Non-vegetarian"
    EGGETARIAN = "eggetarian", "Eggetarian"


class Complexion(models.TextChoices):
    VERY_FAIR = "very_fair", "Very fair"
    FAIR = "fair", "Fair"
    WHEATISH = "wheatish", "Wheatish"
    MEDIUM = "medium", "Medium"
    DUSKY = "dusky", "Dusky"
    DARK = "dark", "Dark"


class SubCaste(models.TextChoices):
    """The five Vishwabrahmin (Vishwakarma) occupational sub-groups."""

    GOLDSMITH = "goldsmith", "Goldsmith (Ausula / Swarnakara)"
    CARPENTER = "carpenter", "Carpenter (Vadla / Vardhaki)"
    BLACKSMITH = "blacksmith", "Blacksmith (Kammari / Karmara)"
    BRAZIER = "kanchari", "Kanchari (Kansara)"
    SCULPTOR = "shilpi", "Shilpi (Sthapati)"


class Region(models.TextChoices):
    TELANGANA = "telangana", "Telangana"
    ANDHRA = "andhra", "Andhra"
    RAYALASEEMA = "rayalaseema", "Rayalaseema"
    OTHER = "other", "Other"


class ProfileFor(models.TextChoices):
    SELF = "self", "Myself"
    SON = "son", "Son"
    DAUGHTER = "daughter", "Daughter"
    BROTHER = "brother", "Brother"
    SISTER = "sister", "Sister"
    RELATIVE = "relative", "Relative / Friend"


class ProfileStatus(models.TextChoices):
    PENDING = "pending", "Pending approval"
    ACTIVE = "active", "Active"
    EXPIRED = "expired", "Expired"
    HIDDEN = "hidden", "Hidden by member"
    SUSPENDED = "suspended", "Suspended by admin"


# --- legacy code -> canonical value maps (used only by the importer) ---

LEGACY_MARITAL_STATUS = {
    "UM": MaritalStatus.UNMARRIED,
    "DV": MaritalStatus.DIVORCED,
    "WD": MaritalStatus.WIDOWED,
    "ST": MaritalStatus.SEPARATED,
}

LEGACY_FOOD_HABIT = {
    "V": FoodHabit.VEGETARIAN,
    "NV": FoodHabit.NON_VEGETARIAN,
}

LEGACY_REGION = {
    "telangana": Region.TELANGANA,
    "andhra": Region.ANDHRA,
    "ralayaseema": Region.RAYALASEEMA,
    "rayalaseema": Region.RAYALASEEMA,
}

LEGACY_PROFILE_STATUS = {
    "A": ProfileStatus.ACTIVE,
    "E": ProfileStatus.EXPIRED,
}

LEGACY_COMPLEXION = {
    "very fair": Complexion.VERY_FAIR,
    "fair": Complexion.FAIR,
    "fair & white": Complexion.FAIR,
    "white": Complexion.VERY_FAIR,
    "wheatish": Complexion.WHEATISH,
    "medium": Complexion.MEDIUM,
    "medium fair": Complexion.MEDIUM,
    "normal": Complexion.MEDIUM,
    "average": Complexion.MEDIUM,
    "dusky": Complexion.DUSKY,
    "brown": Complexion.DUSKY,
    "brownish": Complexion.DUSKY,
    "light brown": Complexion.WHEATISH,
    "dark": Complexion.DARK,
    "chamanachaya": Complexion.WHEATISH,
    "chamana chaya": Complexion.WHEATISH,
}
