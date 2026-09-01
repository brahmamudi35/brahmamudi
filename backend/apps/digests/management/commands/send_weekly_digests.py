"""Send the weekly match-activity digest.

Run once a week (cron / systemd timer / CI job):

    python manage.py send_weekly_digests
    python manage.py send_weekly_digests --dry-run
    python manage.py send_weekly_digests --profile BM000123 --force

For every active member who hasn't opted out (`User.email_digest`), builds a
digest of new matches, interests awaiting a reply and recent profile visitors,
and emails it. Members with nothing to report are skipped. `last_digest_sent_at`
guards against a double run inside the same week unless `--force` is given.
"""

from __future__ import annotations

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.digests.emails import send_digest_email
from apps.digests.services import build_digest
from apps.profiles.models import Profile
from apps.reference.enums import ProfileStatus

_MIN_GAP = timedelta(days=6)


class Command(BaseCommand):
    help = "Email active members their weekly match-activity digest."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true",
                            help="Report who would be mailed; send nothing.")
        parser.add_argument("--force", action="store_true",
                            help="Ignore the one-per-week guard.")
        parser.add_argument("--since-days", type=int, default=7,
                            help="Window for 'this week' activity (default 7).")
        parser.add_argument("--limit", type=int, default=0,
                            help="Cap the number of members processed.")
        parser.add_argument("--profile", default="",
                            help="Only this regno (implies --force).")

    def handle(self, *args, **opts):
        dry = opts["dry_run"]
        force = opts["force"] or bool(opts["profile"])
        since = timezone.now() - timedelta(days=opts["since_days"])
        cutoff = timezone.now() - _MIN_GAP

        members = (
            Profile.objects.filter(
                status=ProfileStatus.ACTIVE, user__email_digest=True
            )
            .exclude(user__email="")
            .select_related("user", "partner_preference")
            .order_by("id")
        )
        if opts["profile"]:
            members = members.filter(regno=opts["profile"])
        if opts["limit"]:
            members = members[: opts["limit"]]

        sent = skipped_recent = nothing = 0
        for profile in members:
            if not force and profile.user.last_digest_sent_at and \
                    profile.user.last_digest_sent_at > cutoff:
                skipped_recent += 1
                continue

            digest = build_digest(profile, since=since)
            if digest is None:
                nothing += 1
                continue

            summary = (
                f"{len(digest['matches'])} matches, "
                f"{digest['pending_interest_count']} interests, "
                f"{digest['visitor_count']} visitors"
            )
            self.stdout.write(f"  {profile.regno} <{profile.user.email}>: {summary}")
            if dry:
                continue

            if send_digest_email(profile, digest):
                profile.user.last_digest_sent_at = timezone.now()
                profile.user.save(update_fields=["last_digest_sent_at"])
                sent += 1

        verb = "would send" if dry else "sent"
        self.stdout.write(self.style.SUCCESS(
            f"{verb} {sent}; skipped {skipped_recent} (mailed recently), "
            f"{nothing} (nothing to report)"
        ))
