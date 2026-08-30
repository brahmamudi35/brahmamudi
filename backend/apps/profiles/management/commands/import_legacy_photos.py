"""Attach legacy profile photos once the image files are available.

The SQL dump only stores filenames (`tbl_profiles.photo1` / `photo2`); the actual
JPEGs must be copied off the old server first. Point --source at that directory.

    python manage.py import_legacy_photos --source /path/to/old/uploads
    python manage.py import_legacy_photos --source ./_photos --dry-run
    python manage.py import_legacy_photos --source ./_photos --needs-review

Idempotent: a photo whose `legacy_filename` is already attached to the profile is
skipped, so the command can be re-run as more files are recovered.
"""

from __future__ import annotations

import os
from collections import Counter
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.profiles.models import Profile, ProfilePhoto
from tools.legacy_import.dump_parser import iter_rows

DEFAULT_DUMP = Path(__file__).resolve().parents[5] / "brahmamu_vbss.sql.gz"
_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


class Command(BaseCommand):
    help = "Attach legacy profile photo files to ProfilePhoto rows."

    def add_arguments(self, parser):
        parser.add_argument("--source", required=True, help="directory holding the legacy image files")
        parser.add_argument("--dump", default=str(DEFAULT_DUMP))
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--needs-review", action="store_true",
                            help="mark imported photos unapproved (default: approved)")
        parser.add_argument("--limit", type=int, default=0)

    def handle(self, *args, **opts):
        source = Path(opts["source"])
        if not source.is_dir():
            raise CommandError(f"--source is not a directory: {source}")
        dump = Path(opts["dump"])
        if not dump.exists():
            raise CommandError(f"dump not found: {dump}")

        approved = not opts["needs_review"]
        dry_run = opts["dry_run"]
        stats: Counter = Counter()

        index, file_count = self._index_files(source)
        self.stdout.write(f"indexed {file_count} image files under {source}")

        profiles = {p.legacy_rid: p for p in Profile.objects.exclude(legacy_rid=None)}
        existing = {
            (pid, name)
            for pid, name in ProfilePhoto.objects.exclude(legacy_filename="")
            .values_list("profile_id", "legacy_filename")
        }

        try:
            with transaction.atomic():
                for n, row in enumerate(iter_rows(dump, "tbl_profiles")):
                    if opts["limit"] and n >= opts["limit"]:
                        break
                    profile = profiles.get(_int(row.get("rid")))
                    if profile is None:
                        continue
                    for col in ("photo1", "photo2"):
                        name = (row.get(col) or "").strip()
                        if not name:
                            continue
                        if (profile.pk, name) in existing:
                            stats["skipped (already attached)"] += 1
                            continue
                        path = index.get(name.lower()) or index.get(_slug(name))
                        if path is None:
                            stats["missing file"] += 1
                            continue
                        stats["attached"] += 1
                        if dry_run:
                            continue
                        with open(path, "rb") as fh:
                            photo = ProfilePhoto(
                                profile=profile,
                                is_primary=(col == "photo1"),
                                is_approved=approved,
                                legacy_filename=name,
                            )
                            photo.image.save(_safe_name(name), File(fh), save=True)
                        existing.add((profile.pk, name))
                if dry_run:
                    self.stdout.write(self.style.WARNING("dry-run: rolling back"))
                    transaction.set_rollback(True)
        finally:
            for key, val in sorted(stats.items()):
                self.stdout.write(f"  {key:28s} {val}")
            self.stdout.write(self.style.SUCCESS("done" if not dry_run else "dry-run done"))

    @staticmethod
    def _index_files(source: Path) -> tuple[dict[str, Path], int]:
        index: dict[str, Path] = {}
        count = 0
        for root, _dirs, files in os.walk(source):
            for fname in files:
                if Path(fname).suffix.lower() not in _IMAGE_EXT:
                    continue
                full = Path(root) / fname
                count += 1
                index.setdefault(fname.lower(), full)
                index.setdefault(_slug(fname), full)
        return index, count


def _slug(name: str) -> str:
    return "".join(c for c in name.lower() if c.isalnum())


def _safe_name(name: str) -> str:
    stem = "".join(c if c.isalnum() or c in "-_." else "_" for c in name).strip("_")
    return stem or "photo.jpg"


def _int(value):
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None
