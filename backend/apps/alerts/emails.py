import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_alert_email(saved, matches: list) -> None:
    user = getattr(saved.owner, "user", None)
    to = (getattr(user, "email", "") or "").strip()
    if not to:
        return
    base = settings.FRONTEND_BASE_URL.rstrip("/")
    lines = [
        f"- {m.first_name} ({m.regno}), "
        f"{m.age or '?'} yrs, {m.subcaste or 'sub-caste n/a'}"
        for m in matches[:10]
    ]
    more = f"\n...and {len(matches) - 10} more." if len(matches) > 10 else ""
    try:
        send_mail(
            subject=f"{len(matches)} new match{'es' if len(matches) != 1 else ''} "
                    f"for \"{saved.name}\"",
            message=(
                f"Namaste {saved.owner.first_name or 'there'},\n\n"
                f"New profiles matching your saved search \"{saved.name}\":\n\n"
                + "\n".join(lines) + more
                + f"\n\nView them: {base}/saved-searches\n\n— brahmamudi"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to],
            fail_silently=False,
        )
    except Exception:  # noqa: BLE001
        logger.exception("failed to send search-alert email to %s", to)
