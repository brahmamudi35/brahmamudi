"""Idempotently create a groom/bride test account pair from an env var. Safe
to run on every deploy: no-ops once the accounts already exist, so it belongs
in the startup command alongside migrate/seed_reference/ensure_superuser.
Leave TEST_ACCOUNTS_PASSWORD unset to skip.
"""

import datetime as dt
import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.profiles.models import Profile
from apps.reference.models import EducationLevel

User = get_user_model()

ACCOUNTS = [
    dict(
        email="test.groom@brahmamudi.com",
        first_name="Rahul",
        surname="Test",
        gender="M",
        date_of_birth=dt.date(1993, 8, 8),
        height_cm=178,
        occupation="Engineer",
        education_name="Masters - Engineering / Computers",
        regno="TEST-test.groom",
    ),
    dict(
        email="test.bride@brahmamudi.com",
        first_name="Test",
        surname="Bride",
        gender="F",
        date_of_birth=dt.date(1996, 5, 5),
        height_cm=160,
        occupation="Engineer",
        education_name="Masters - Arts",
        regno="TEST-test.bride",
    ),
]


class Command(BaseCommand):
    help = "Create a groom/bride test account pair from TEST_ACCOUNTS_PASSWORD."

    def handle(self, *args, **opts):
        password = os.environ.get("TEST_ACCOUNTS_PASSWORD")
        if not password:
            self.stdout.write("TEST_ACCOUNTS_PASSWORD not set, skipping.")
            return

        for acc in ACCOUNTS:
            user, created = User.objects.get_or_create(
                email=acc["email"],
                defaults={"full_name": f"{acc['first_name']} {acc['surname']}", "is_active": True},
            )
            if not created:
                self.stdout.write(f"{acc['email']} already exists, leaving as-is")
                continue

            user.set_password(password)
            user.must_reset_password = False
            user.email_verified = True
            user.save()

            education = EducationLevel.objects.filter(name=acc["education_name"]).first()
            Profile.objects.create(
                user=user,
                regno=acc["regno"],
                first_name=acc["first_name"],
                surname=acc["surname"],
                gender=acc["gender"],
                date_of_birth=acc["date_of_birth"],
                marital_status="unmarried",
                mother_tongue="Telugu",
                height_cm=acc["height_cm"],
                caste="Vishwabrahmin",
                subcaste="goldsmith",
                education=education,
                occupation=acc["occupation"],
                status="active",
                photos_visible=True,
                is_verified=True,
            )
            self.stdout.write(self.style.SUCCESS(f"created test profile {acc['email']}"))
