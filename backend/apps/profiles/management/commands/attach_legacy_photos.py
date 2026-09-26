"""One-off: attach ProfilePhoto rows from a JSON export (see
legacy_photos_map.json), pointing at image files that already exist under
MEDIA_ROOT (e.g. uploaded directly onto a Railway volume). Does not touch
file storage - only sets the FileField name to the given relative path.
Idempotent: a (profile, legacy_filename) pair already attached is skipped.
"""

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.profiles.models import Profile, ProfilePhoto


class Command(BaseCommand):
    help = "Attach ProfilePhoto rows from a legacy_photos_map.json export."

    def add_arguments(self, parser):
        parser.add_argument("--map", default="legacy_photos_map.json")

    def handle(self, *args, **opts):
        path = Path(opts["map"])
        if not path.exists():
            raise CommandError(f"map file not found: {path}")
        rows = json.loads(path.read_text(encoding="utf-8"))

        profiles = {p.legacy_rid: p for p in Profile.objects.exclude(legacy_rid=None)}
        existing = set(
            ProfilePhoto.objects.exclude(legacy_filename="").values_list(
                "profile_id", "legacy_filename"
            )
        )

        created = skipped_existing = skipped_no_profile = 0
        for row in rows:
            profile = profiles.get(row["legacy_rid"])
            if profile is None:
                skipped_no_profile += 1
                continue
            if (profile.pk, row["legacy_filename"]) in existing:
                skipped_existing += 1
                continue
            ProfilePhoto.objects.create(
                profile=profile,
                image=row["image_name"],
                is_primary=row["is_primary"],
                is_approved=row["is_approved"],
                legacy_filename=row["legacy_filename"],
            )
            existing.add((profile.pk, row["legacy_filename"]))
            created += 1

        self.stdout.write(self.style.SUCCESS(
            f"attached {created}, skipped {skipped_existing} existing, "
            f"{skipped_no_profile} no matching profile"
        ))
