"""Seed a throwaway database for the Playwright end-to-end suite.

Refuses to run unless E2E=1 is set AND the database is a local SQLite file, so
it can never touch production or the dev Postgres database.

Accounts (password for all: E2e-pass-123):
  super@e2e.test   superuser
  staff@e2e.test   staff, no member profile
  bride@e2e.test   verified member, female, with horoscope stars
  groom@e2e.test   verified member, male, with horoscope stars
  + a handful of extra brides / grooms for search, and one pending photo.
"""

import io
import os
from datetime import date

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from PIL import Image

from apps.profiles.models import PartnerPreference, Profile, ProfilePhoto
from apps.reference.models import EducationLevel, Nakshatram, Raasi

User = get_user_model()
PASSWORD = "E2e-pass-123"


def _png(color) -> ContentFile:
    buf = io.BytesIO()
    Image.new("RGB", (400, 500), color).save(buf, "JPEG")
    return ContentFile(buf.getvalue(), name="e2e.jpg")


class Command(BaseCommand):
    help = "Seed known accounts for the end-to-end browser tests (E2E=1, SQLite only)."

    def handle(self, *args, **opts):
        engine = settings.DATABASES["default"]["ENGINE"]
        if os.environ.get("E2E") != "1" or "sqlite" not in engine:
            raise CommandError("seed_e2e only runs with E2E=1 against a SQLite database.")

        User.objects.create_superuser("super@e2e.test", PASSWORD, full_name="Super Admin",
                                      email_verified=True)
        User.objects.create_user("staff@e2e.test", PASSWORD, full_name="Desk Staff",
                                 is_staff=True, email_verified=True)

        stars = list(Nakshatram.objects.order_by("order")[:12])
        raasis = list(Raasi.objects.order_by("order")[:12])
        edu = EducationLevel.objects.order_by("sort_order").first()

        def member(email, first, gender, n, **extra):
            user = User.objects.create_user(email, PASSWORD, full_name=first, email_verified=True)
            p = Profile.objects.create(
                user=user, regno=f"BM9{n:05d}", first_name=first, surname="Ereddy",
                gender=gender, status="active", date_of_birth=date(1994 + n % 6, 3, 10 + n),
                marital_status="unmarried", height_cm=160 + n * 2, subcaste="goldsmith",
                nakshatram=stars[n % len(stars)], raasi=raasis[n % len(raasis)],
                education=edu, occupation="Engineer", work_location="Hyderabad",
                region="telangana", contact_phone=f"98480{n:05d}", about=f"E2E member {first}.",
                **extra,
            )
            PartnerPreference.objects.get_or_create(profile=p)
            ProfilePhoto.objects.create(profile=p, image=_png((120 + n * 9, 80, 90)),
                                        is_primary=True, is_approved=True)
            return p

        member("bride@e2e.test", "Lakshmi", "F", 1)
        member("groom@e2e.test", "Ravi", "M", 2)
        for i, name in enumerate(["Sita", "Padma", "Anjali", "Divya"], start=3):
            member(f"bride{i}@e2e.test", name, "F", i)
        for i, name in enumerate(["Kiran", "Suresh", "Mahesh"], start=7):
            member(f"groom{i}@e2e.test", name, "M", i)

        # Give the main groom the birth star that makes the most brides a
        # recommended porutham match, so Matches has something to show.
        from apps.profiles import porutham

        ravi = Profile.objects.get(first_name="Ravi")
        brides = list(Profile.objects.filter(gender="F"))

        def good_matches(star):
            ravi.nakshatram = star
            return sum(porutham.compute(b, ravi)["verdict"] in ("excellent", "acceptable")
                       for b in brides)

        best = max(Nakshatram.objects.all(), key=good_matches)
        ravi.nakshatram = best
        ravi.save(update_fields=["nakshatram"])

        # one photo waiting for staff approval
        divya = Profile.objects.get(first_name="Divya")
        ProfilePhoto.objects.create(profile=divya, image=_png((30, 160, 90)),
                                    is_primary=False, is_approved=False)

        self.stdout.write(self.style.SUCCESS(
            f"E2E seed: {User.objects.count()} users, {Profile.objects.count()} profiles"))
