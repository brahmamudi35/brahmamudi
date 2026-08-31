"""Attach legacy profile photos once the image files are available.

The SQL dump only stores filenames (`tbl_profiles.photo1` / `photo2`); the actual
JPEGs must be copied off the old server first (cPanel File Manager / FTP / SSH).
The old host has two folders: `thumbphotos/` (75px thumbnails, useless) and
`thumbphotos/photos/` (full-size originals). Point --source at the latter.

    # what files the migration needs (no --source required):
    python manage.py import_legacy_photos --report needed-photos.csv

    # once you have the files:
    python manage.py import_legacy_photos --source ./_photos --dry-run
    python manage.py import_legacy_photos --source ./_photos
    python manage.py import_legacy_photos --source ./_photos --needs-review

    # the old server's `thumbphotos/` holds 75px thumbnails - skip those:
    python manage.py import_legacy_photos --source ./photos --min-size 200

    # later, swap thumbnails already imported for the full-size originals:
    python manage.py import_legacy_photos --source ./photos --replace

Idempotent: a photo whose `legacy_filename` is already attached to the profile is
skipped (unless --replace), so the command can be re-run as more files arrive.
"""

from __future__ import annotations

import csv
import os
from collections import Counter
from pathlib import Path
from urllib.parse import unquote

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.profiles.models import Profile, ProfilePhoto
from tools.legacy_import.dump_parser import iter_rows

DEFAULT_DUMP = Path(__file__).resolve().parents[5] / "brahmamu_vbss.sql.gz"
_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


class Command(BaseCommand):
    help = "Attach legacy profile photo files to ProfilePhoto rows."

    def add_arguments(self, parser):
        parser.add_argument("--source", help="directory holding the legacy image files")
        parser.add_argument("--report", metavar="CSV",
                            help="write the list of photos the migration needs and exit")
        parser.add_argument("--dump", default=str(DEFAULT_DUMP))
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--needs-review", action="store_true",
                            help="mark imported photos unapproved (default: approved)")
        parser.add_argument("--replace", action="store_true",
                            help="re-copy the file for photos already attached "
                                 "(use when swapping thumbnails for full-size)")
        parser.add_argument("--min-size", type=int, default=0, metavar="PX",
                            help="skip images whose largest side is under PX "
                                 "(filters out thumbnail folders)")
        parser.add_argument("--limit", type=int, default=0)

    def handle(self, *args, **opts):
        dump = Path(opts["dump"])
        if not dump.exists():
            raise CommandError(f"dump not found: {dump}")

        if opts["report"]:
            self._write_report(dump, Path(opts["report"]))
            return

        if not opts["source"]:
            raise CommandError("give --source <dir> (or --report <csv> to see what's needed)")
        source = Path(opts["source"])
        if not source.is_dir():
            raise CommandError(f"--source is not a directory: {source}")

        approved = not opts["needs_review"]
        dry_run = opts["dry_run"]
        replace = opts["replace"]
        min_size = opts["min_size"]
        stats: Counter = Counter()

        index, file_count = self._index_files(source)
        self.stdout.write(f"indexed {file_count} image files under {source}")

        profiles = {p.legacy_rid: p for p in Profile.objects.exclude(legacy_rid=None)}
        attached = {
            (pid, fname): pk
            for pk, pid, fname in ProfilePhoto.objects.exclude(legacy_filename="")
            .values_list("id", "profile_id", "legacy_filename")
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
                        already = attached.get((profile.pk, name))
                        if already and not replace:
                            stats["skipped (already attached)"] += 1
                            continue
                        path = index.get(name.lower()) or index.get(_slug(name))
                        if path is None:
                            stats["missing file"] += 1
                            continue
                        if min_size and _largest_side(path) < min_size:
                            stats[f"skipped (under {min_size}px)"] += 1
                            continue
                        stats["replaced" if already else "attached"] += 1
                        if dry_run:
                            continue
                        make_primary = col == "photo1" and not profile.photos.exists()
                        with open(path, "rb") as fh:
                            content = _prepare(fh, _safe_name(name))
                            if already:
                                photo = ProfilePhoto.objects.get(pk=already)
                                photo.image.delete(save=False)
                            else:
                                photo = ProfilePhoto(
                                    profile=profile,
                                    is_primary=make_primary,
                                    is_approved=approved,
                                    legacy_filename=name,
                                )
                            photo.image.save(content.name, content, save=True)
                        if make_primary:
                            profile.photos.exclude(pk=photo.pk).update(is_primary=False)
                        attached[(profile.pk, name)] = photo.pk
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
                for key in {fname.lower(), unquote(fname).lower(),
                            _slug(fname), _slug(unquote(fname))}:
                    index.setdefault(key, full)
        return index, count

    def _write_report(self, dump: Path, out: Path) -> None:
        by_rid = {
            p.legacy_rid: p
            for p in Profile.objects.exclude(legacy_rid=None).select_related("user")
        }
        rows, seen = [], set()
        for row in iter_rows(dump, "tbl_profiles"):
            profile = by_rid.get(_int(row.get("rid")))
            for slot in ("photo1", "photo2"):
                name = (row.get(slot) or "").strip()
                if not name or name in seen:
                    continue
                seen.add(name)
                rows.append({
                    "filename": name,
                    "slot": slot,
                    "legacy_rid": row.get("rid"),
                    "regno": profile.regno if profile else "",
                    "name": profile.full_name if profile else (row.get("username") or ""),
                    "email": profile.user.email if profile else row.get("emailid") or "",
                    "in_db": profile is not None,
                })
        out.write_text("", encoding="utf-8")
        with out.open("w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)
        self.stdout.write(self.style.SUCCESS(
            f"{len(rows)} photo files needed ({sum(r['in_db'] for r in rows)} map to a "
            f"current profile) -> {out}"
        ))


def _largest_side(path: Path) -> int:
    from PIL import Image

    try:
        with Image.open(path) as im:
            return max(im.size)
    except Exception:  # noqa: BLE001 - unreadable image counts as tiny
        return 0


def _prepare(fh, name: str):
    """Downscale / re-encode to JPEG; fall back to the raw bytes on failure."""
    from django.core.files.base import ContentFile

    from apps.profiles.images import downscale

    try:
        return downscale(fh, name=name)
    except Exception:  # noqa: BLE001
        fh.seek(0)
        return ContentFile(fh.read(), name=name)


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
