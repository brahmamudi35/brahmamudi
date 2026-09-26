"""Idempotently create/update a superuser from env vars. Safe to run on every
deploy: no-ops once ADMIN_EMAIL already exists, so it belongs in the startup
command alongside migrate/seed_reference. Leave ADMIN_EMAIL unset to skip.
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Create or update the bootstrap superuser from ADMIN_EMAIL / ADMIN_PASSWORD."

    def handle(self, *args, **opts):
        import os

        email = os.environ.get("ADMIN_EMAIL")
        password = os.environ.get("ADMIN_PASSWORD")
        if not email or not password:
            self.stdout.write("ADMIN_EMAIL / ADMIN_PASSWORD not set, skipping.")
            return

        user, created = User.objects.get_or_create(
            email=email.lower(),
            defaults={"is_staff": True, "is_superuser": True, "is_active": True},
        )
        if created:
            user.set_password(password)
            user.must_reset_password = False
            user.save()
            self.stdout.write(self.style.SUCCESS(f"created superuser {email}"))
        else:
            self.stdout.write(f"superuser {email} already exists, leaving password as-is")
