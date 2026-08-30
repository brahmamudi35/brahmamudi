from django.db import models


class Nakshatram(models.Model):
    """The 27 birth stars, with attributes used for guna-milan compatibility."""

    GANA_CHOICES = [("deva", "Deva"), ("manushya", "Manushya"), ("rakshasa", "Rakshasa")]
    NADI_CHOICES = [("aadi", "Aadi"), ("madhya", "Madhya"), ("antya", "Antya")]

    order = models.PositiveSmallIntegerField(unique=True, help_text="1-27")
    name = models.CharField(max_length=40, unique=True)
    aliases = models.JSONField(default=list, blank=True)
    lord = models.CharField(max_length=20, blank=True)
    gana = models.CharField(max_length=10, choices=GANA_CHOICES, blank=True)
    yoni = models.CharField(max_length=20, blank=True)
    nadi = models.CharField(max_length=10, choices=NADI_CHOICES, blank=True)

    class Meta:
        db_table = "ref_nakshatram"
        ordering = ["order"]

    def __str__(self):
        return self.name


class Raasi(models.Model):
    """The 12 moon signs."""

    order = models.PositiveSmallIntegerField(unique=True, help_text="1-12")
    name = models.CharField(max_length=40, unique=True)
    aliases = models.JSONField(default=list, blank=True)
    lord = models.CharField(max_length=20, blank=True)
    english_name = models.CharField(max_length=40, blank=True)

    class Meta:
        db_table = "ref_raasi"
        ordering = ["order"]
        verbose_name_plural = "Raasis"

    def __str__(self):
        return self.name


class EducationLevel(models.Model):
    """Education categories. `legacy_code` maps tbl_profiles.Edu_code."""

    CATEGORY_CHOICES = [
        ("school", "School"),
        ("diploma", "Diploma"),
        ("bachelors", "Bachelor's"),
        ("masters", "Master's"),
        ("doctorate", "Doctorate"),
        ("other", "Other"),
    ]

    name = models.CharField(max_length=80, unique=True)
    category = models.CharField(max_length=12, choices=CATEGORY_CHOICES)
    legacy_code = models.IntegerField(null=True, blank=True, unique=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "ref_education_level"
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name
