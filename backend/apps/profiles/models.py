from datetime import date

from django.conf import settings
from django.db import models

from apps.reference import enums


class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    legacy_rid = models.IntegerField(null=True, blank=True, unique=True, db_index=True)
    regno = models.CharField(max_length=64, unique=True, db_index=True)
    profile_for = models.CharField(
        max_length=12, choices=enums.ProfileFor.choices, default=enums.ProfileFor.SELF
    )

    # --- identity ---
    first_name = models.CharField(max_length=120)
    surname = models.CharField(max_length=120, blank=True)
    gender = models.CharField(max_length=1, choices=enums.Gender.choices)
    date_of_birth = models.DateField(null=True, blank=True)
    marital_status = models.CharField(
        max_length=12, choices=enums.MaritalStatus.choices, blank=True
    )
    mother_tongue = models.CharField(max_length=50, default="Telugu")

    # --- physical ---
    height_cm = models.PositiveSmallIntegerField(null=True, blank=True)
    complexion = models.CharField(max_length=12, choices=enums.Complexion.choices, blank=True)
    food_habit = models.CharField(max_length=12, choices=enums.FoodHabit.choices, blank=True)
    physically_challenged = models.BooleanField(default=False)

    # --- community & astrology ---
    caste = models.CharField(max_length=50, default="Vishwabrahmin")
    subcaste = models.CharField(max_length=12, choices=enums.SubCaste.choices, blank=True)
    gothram = models.CharField(max_length=120, blank=True)
    nakshatram = models.ForeignKey(
        "reference.Nakshatram", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="profiles",
    )
    raasi = models.ForeignKey(
        "reference.Raasi", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="profiles",
    )
    paadam = models.PositiveSmallIntegerField(
        null=True, blank=True, choices=[(1, "1"), (2, "2"), (3, "3"), (4, "4")]
    )
    time_of_birth = models.CharField(max_length=30, blank=True)
    place_of_birth = models.CharField(max_length=120, blank=True)

    # --- education & career ---
    education = models.ForeignKey(
        "reference.EducationLevel", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="profiles",
    )
    education_detail = models.TextField(blank=True)
    occupation = models.CharField(max_length=150, blank=True)
    company = models.CharField(max_length=200, blank=True)
    work_location = models.CharField(max_length=200, blank=True)
    designation = models.CharField(max_length=200, blank=True)
    annual_income_text = models.CharField(max_length=120, blank=True)
    annual_income_inr = models.PositiveIntegerField(
        null=True, blank=True, help_text="Normalised annual income in INR, if known"
    )
    assets = models.TextField(blank=True)

    # --- location ---
    citizenship = models.CharField(max_length=80, blank=True)
    country_living = models.CharField(max_length=80, blank=True)
    native_district = models.CharField(max_length=80, blank=True)
    settled_at = models.CharField(max_length=80, blank=True)
    region = models.CharField(max_length=12, choices=enums.Region.choices, blank=True)
    address = models.TextField(blank=True)

    # --- family ---
    father_name = models.CharField(max_length=150, blank=True)
    father_occupation = models.CharField(max_length=200, blank=True)
    mother_name = models.CharField(max_length=150, blank=True)
    mother_occupation = models.CharField(max_length=200, blank=True)
    family_background = models.TextField(blank=True)
    siblings = models.JSONField(
        default=list, blank=True,
        help_text="[{relation, name, education, marital_status}]",
    )

    # --- narrative ---
    about = models.TextField(blank=True)
    expectations = models.TextField(blank=True)

    # --- contact (revealed only to eligible members) ---
    contact_phone = models.CharField(max_length=40, blank=True)
    parent_phone = models.CharField(max_length=40, blank=True)
    contact_notes = models.TextField(blank=True)

    # --- status & meta ---
    status = models.CharField(
        max_length=12, choices=enums.ProfileStatus.choices,
        default=enums.ProfileStatus.PENDING, db_index=True,
    )
    photos_visible = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    willing_to_relocate_abroad = models.BooleanField(null=True, blank=True)
    registered_on = models.DateField(null=True, blank=True)
    expires_on = models.DateField(null=True, blank=True)

    legacy_raw = models.JSONField(default=dict, blank=True, editable=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "profile"
        indexes = [
            models.Index(fields=["gender", "status"]),
            models.Index(fields=["subcaste"]),
            models.Index(fields=["date_of_birth"]),
        ]

    def __str__(self):
        return f"{self.regno} - {self.first_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.surname}".strip()

    @property
    def age(self):
        if not self.date_of_birth:
            return None
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )

    @property
    def is_live(self):
        if self.status != enums.ProfileStatus.ACTIVE:
            return False
        if self.expires_on and self.expires_on < date.today():
            return False
        return True


class ProfilePhoto(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="photos")
    image = models.ImageField(upload_to="profile_photos/%Y/%m/")
    is_primary = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=False)
    legacy_filename = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "profile_photo"
        ordering = ["-is_primary", "uploaded_at"]

    def __str__(self):
        return f"photo<{self.profile_id}>"


class PartnerPreference(models.Model):
    profile = models.OneToOneField(
        Profile, on_delete=models.CASCADE, related_name="partner_preference"
    )
    age_min = models.PositiveSmallIntegerField(null=True, blank=True)
    age_max = models.PositiveSmallIntegerField(null=True, blank=True)
    height_min_cm = models.PositiveSmallIntegerField(null=True, blank=True)
    height_max_cm = models.PositiveSmallIntegerField(null=True, blank=True)
    marital_status = models.JSONField(default=list, blank=True)
    subcastes = models.JSONField(default=list, blank=True)
    education_categories = models.JSONField(default=list, blank=True)
    regions = models.JSONField(default=list, blank=True)
    countries = models.JSONField(default=list, blank=True)
    food_habits = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True)
    legacy_raw = models.TextField(blank=True, editable=False)

    class Meta:
        db_table = "partner_preference"

    def __str__(self):
        return f"preference<{self.profile_id}>"


class ProfileView(models.Model):
    """Who viewed whom - powers 'recent visitors' and abuse limits."""

    viewer = models.ForeignKey(
        Profile, on_delete=models.CASCADE, related_name="views_made"
    )
    viewed = models.ForeignKey(
        Profile, on_delete=models.CASCADE, related_name="views_received"
    )
    contact_revealed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "profile_view"
        indexes = [
            models.Index(fields=["viewed", "-created_at"]),
            models.Index(fields=["viewer", "-created_at"]),
        ]


class Shortlist(models.Model):
    owner = models.ForeignKey(
        Profile, on_delete=models.CASCADE, related_name="shortlists"
    )
    target = models.ForeignKey(
        Profile, on_delete=models.CASCADE, related_name="shortlisted_by"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "profile_shortlist"
        constraints = [
            models.UniqueConstraint(fields=["owner", "target"], name="uniq_shortlist")
        ]
