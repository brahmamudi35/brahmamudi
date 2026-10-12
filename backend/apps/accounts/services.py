"""Account lifecycle actions that span several apps."""

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction

log = logging.getLogger(__name__)


def delete_account(user) -> None:
    """Permanently delete a member's account, profile, photos and horoscope.

    Payment rows survive with ``profile`` set to NULL (kept for accounting, as
    the privacy policy says); everything else tied to the profile cascades.
    Uploaded files are removed from storage after the database commit.
    """
    email = user.email
    files = []
    profile = getattr(user, "profile", None)
    if profile is not None:
        files += [ph.image for ph in profile.photos.all() if ph.image]
        doc = getattr(profile, "horoscope", None)
        if doc is not None and doc.file:
            files.append(doc.file)

    with transaction.atomic():
        user.delete()

    for f in files:
        try:
            f.storage.delete(f.name)
        except Exception:  # noqa: BLE001
            log.exception("could not delete %s", f.name)

    try:
        send_mail(
            subject="Your brahmamudi account has been deleted",
            message=(
                "As you requested, your brahmamudi account, profile, photos and "
                "horoscope have been permanently deleted.\n\n"
                "If you did not request this, please contact us at "
                "brahmamudi36@gmail.com.\n\n— brahmamudi"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception:  # noqa: BLE001
        log.exception("account-deleted email failed for %s", email)
