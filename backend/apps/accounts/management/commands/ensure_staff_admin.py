"""Idempotently create/update a staff (non-superuser) account from env vars.
For the frontend member-desk, which only requires is_staff (see
apps/moderation/views.py). Safe to run on every deploy: no-ops once
STAFF_ADMIN_EMAIL already exists. Leave STAFF_ADMIN_EMAIL unset to skip.
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Create or update the bootstrap staff account from STAFF_ADMIN_EMAIL / STAFF_ADMIN_PASSWORD."

    def handle(self, *args, **opts):
        import os

        email = os.environ.get("STAFF_ADMIN_EMAIL")
        password = os.environ.get("STAFF_ADMIN_PASSWORD")
        if not email or not password:
            self.stdout.write("STAFF_ADMIN_EMAIL / STAFF_ADMIN_PASSWORD not set, skipping.")
            return

        user, created = User.objects.get_or_create(
            email=email.lower(),
            defaults={"is_staff": True, "is_superuser": False, "is_active": True},
        )
        if created:
            user.set_password(password)
            user.must_reset_password = False
            user.email_verified = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f"created staff account {email}"))
        else:
            self.stdout.write(f"staff account {email} already exists, leaving password as-is")
