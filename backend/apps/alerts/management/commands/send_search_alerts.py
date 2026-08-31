"""Deliver saved-search alerts.

Run on a schedule (cron / systemd timer / CI job), e.g. hourly:

    python manage.py send_search_alerts
    python manage.py send_search_alerts --dry-run

For each enabled SavedSearch, emails the owner and drops an in-app notification
when profiles newer than the last delivery match. Idempotent: `last_seen_id`
advances so the same profile is never alerted twice.
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.alerts.emails import send_alert_email
from apps.alerts.models import SavedSearch
from apps.alerts.services import run_search
from apps.notifications.services import notify


class Command(BaseCommand):
    help = "Email + notify owners of saved searches about new matches."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--limit", type=int, default=0)

    def handle(self, *args, **opts):
        dry = opts["dry_run"]
        searches = SavedSearch.objects.filter(alerts_enabled=True).select_related(
            "owner", "owner__user"
        )
        if opts["limit"]:
            searches = searches[: opts["limit"]]

        alerted = matches_total = 0
        for saved in searches:
            new = list(run_search(saved).filter(id__gt=saved.last_seen_id))
            if not new:
                continue
            highest = max(p.id for p in new)
            matches_total += len(new)
            self.stdout.write(
                f"  {saved.owner.regno} / \"{saved.name}\": {len(new)} new"
            )
            if dry:
                continue

            send_alert_email(saved, new)
            notify(
                saved.owner,
                "search_alert",
                text=(
                    f"{len(new)} new "
                    f"{'match' if len(new) == 1 else 'matches'} for \"{saved.name}\""
                ),
                url="/saved-searches",
                data={"saved_search_id": saved.id, "count": len(new)},
            )
            saved.last_seen_id = highest
            saved.last_alerted_at = timezone.now()
            saved.save(update_fields=["last_seen_id", "last_alerted_at"])
            alerted += 1

        self.stdout.write(self.style.SUCCESS(
            f"{'would alert' if dry else 'alerted'} {alerted} searches "
            f"({matches_total} new profiles)"
        ))
