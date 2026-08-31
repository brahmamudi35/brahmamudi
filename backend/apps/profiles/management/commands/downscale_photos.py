"""Re-encode existing ProfilePhoto images that are oversized or not JPEG.

    python manage.py downscale_photos --dry-run
    python manage.py downscale_photos               # rewrites in place
    python manage.py downscale_photos --max-side 1200

Safe to re-run; a photo already within limits is skipped.
"""

from __future__ import annotations

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.profiles.images import downscale, needs_downscale
from apps.profiles.models import ProfilePhoto


class Command(BaseCommand):
    help = "Downscale / re-encode oversized ProfilePhoto images."

    def add_arguments(self, parser):
        parser.add_argument("--max-side", type=int,
                            default=settings.PROFILE_PHOTO_MAX_SIDE)
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--limit", type=int, default=0)
        parser.add_argument("--prune-orphans", action="store_true",
                            help="also delete media files no ProfilePhoto references")

    def handle(self, *args, **opts):
        max_side = opts["max_side"]
        dry = opts["dry_run"]
        done = skipped = failed = 0
        saved_bytes = 0

        qs = ProfilePhoto.objects.exclude(image="").order_by("id")
        if opts["limit"]:
            qs = qs[: opts["limit"]]

        for photo in qs.iterator():
            try:
                with photo.image.open("rb") as fh:
                    if not needs_downscale(fh, max_side):
                        skipped += 1
                        continue
                    before = photo.image.size
                    if dry:
                        done += 1
                        continue
                    fh.seek(0)
                    new = downscale(fh, max_side=max_side,
                                    name=photo.image.name.rsplit("/", 1)[-1])
                old_name = photo.image.name
                photo.image.save(new.name, new, save=True)
                if photo.image.name != old_name:
                    from django.core.files.storage import default_storage

                    default_storage.delete(old_name)
                saved_bytes += max(before - photo.image.size, 0)
                done += 1
            except Exception as exc:  # noqa: BLE001
                self.stderr.write(f"  photo {photo.pk}: {exc}")
                failed += 1

        self.stdout.write(
            f"{'would rewrite' if dry else 'rewrote'} {done}, skipped {skipped}, "
            f"failed {failed}" + ("" if dry else f", freed {saved_bytes/1e6:.1f} MB")
        )

        if opts["prune_orphans"]:
            self._prune_orphans(dry)

    def _prune_orphans(self, dry: bool) -> None:
        from pathlib import Path

        from django.core.files.storage import default_storage

        referenced = set(ProfilePhoto.objects.values_list("image", flat=True))
        root = Path(default_storage.location) / "profile_photos"
        pruned = freed = 0
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            rel = path.relative_to(default_storage.location).as_posix()
            if rel in referenced:
                continue
            freed += path.stat().st_size
            pruned += 1
            if not dry:
                path.unlink()
        self.stdout.write(
            f"{'would prune' if dry else 'pruned'} {pruned} orphan files"
            + ("" if dry else f", freed {freed/1e6:.1f} MB")
        )
