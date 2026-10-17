"""Replace the reconstructed 21 education levels with the old site's real
qualification groups, and move every profile onto them.

Imported members are re-mapped exactly from the Edu_code kept in their
legacy_raw row. Anyone else is mapped from the old level they had picked.
"""

from django.db import migrations, models

GROUPS = [
    # name, category, legacy_code, sort_order (mirrors reference/data.py)
    ("Group 1", "group1", 1, 1),
    ("Doctor", "doctor", 2, 2),
    ("Masters", "masters", 3, 3),
    ("Bachelors", "bachelors", 4, 4),
    ("USA & other countries", "abroad", 5, 5),
    ("CA & ICWAI", "ca_icwai", 6, 6),
    ("PG, M.Com", "pg_mcom", 7, 7),
    ("Graduate & Non Graduate", "graduate", 8, 8),
    ("Second marriage", "remarriage", 10, 10),
]

# old reconstructed legacy_code -> new group code
OLD_LEVEL_TO_GROUP = {
    1: 8, 2: 8, 3: 8,                          # school / higher secondary / diploma
    4: 4, 5: 4, 6: 4, 7: 4, 9: 4, 10: 4, 11: 4,  # bachelors
    8: 2, 17: 2, 19: 2, 20: 2,                 # medicine, PhD / MD
    12: 3, 13: 3, 14: 3, 16: 3, 18: 3,         # masters
    15: 7,                                     # masters - commerce
}

OLD_CATEGORY_TO_NEW = {
    "school": "graduate", "diploma": "graduate", "bachelors": "bachelors",
    "masters": "masters", "doctorate": "doctor",
}


def _legacy_group(raw):
    try:
        code = int((raw or {}).get("Edu_code") or 0)
    except (TypeError, ValueError):
        return None
    if code < 1 or code > 20:
        return None
    code = code - 10 if code > 10 else code
    return None if code == 9 else code


def forwards(apps, schema_editor):
    EducationLevel = apps.get_model("reference", "EducationLevel")
    Profile = apps.get_model("profiles", "Profile")
    PartnerPreference = apps.get_model("profiles", "PartnerPreference")

    old_code = dict(EducationLevel.objects.values_list("id", "legacy_code"))
    target = {}
    for pid, rid, raw, edu_id in Profile.objects.values_list(
        "id", "legacy_rid", "legacy_raw", "education_id"
    ):
        if rid is not None and raw:
            target[pid] = _legacy_group(raw)
        else:
            target[pid] = OLD_LEVEL_TO_GROUP.get(old_code.get(edu_id))

    Profile.objects.update(education=None)
    EducationLevel.objects.all().delete()
    new = {
        code: EducationLevel.objects.create(
            name=name, category=cat, legacy_code=code, sort_order=sort
        )
        for name, cat, code, sort in GROUPS
    }
    by_group = {}
    for pid, code in target.items():
        if code in new:
            by_group.setdefault(code, []).append(pid)
    for code, ids in by_group.items():
        Profile.objects.filter(id__in=ids).update(education=new[code])

    for pref in PartnerPreference.objects.exclude(education_categories=[]):
        cats = []
        for c in pref.education_categories or []:
            c = OLD_CATEGORY_TO_NEW.get(c, c)
            if c in {g[1] for g in GROUPS} and c not in cats:
                cats.append(c)
        if cats != pref.education_categories:
            pref.education_categories = cats
            pref.save(update_fields=["education_categories"])


class Migration(migrations.Migration):

    dependencies = [
        ("reference", "0001_initial"),
        ("profiles", "0004_subcaste_labels"),
    ]

    operations = [
        migrations.AlterField(
            model_name="educationlevel",
            name="category",
            field=models.CharField(
                choices=[
                    ("group1", "Group 1"), ("doctor", "Doctor"), ("masters", "Masters"),
                    ("bachelors", "Bachelors"), ("abroad", "USA & other countries"),
                    ("ca_icwai", "CA & ICWAI"), ("pg_mcom", "PG, M.Com"),
                    ("graduate", "Graduate & Non Graduate"),
                    ("remarriage", "Second marriage"),
                ],
                max_length=12,
            ),
        ),
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
