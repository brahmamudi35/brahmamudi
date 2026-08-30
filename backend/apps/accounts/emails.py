from django.conf import settings
from django.core.mail import send_mail

from .tokens import make_email_token, make_password_reset_token


def _base():
    return settings.FRONTEND_BASE_URL.rstrip("/")


def send_verification_email(user) -> None:
    token = make_email_token(user)
    link = f"{_base()}/verify-email?token={token}"
    send_mail(
        subject="Verify your brahmamudi email",
        message=(
            f"Welcome to brahmamudi.\n\n"
            f"Please confirm your email address by opening this link:\n{link}\n\n"
            f"The link expires in {settings.EMAIL_TOKEN_MAX_AGE_DAYS} days."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_password_reset_email(user) -> None:
    uidb64, token = make_password_reset_token(user)
    link = f"{_base()}/reset-password?uid={uidb64}&token={token}"
    send_mail(
        subject="Reset your brahmamudi password",
        message=(
            "We received a request to reset your brahmamudi password.\n\n"
            f"Open this link to choose a new password:\n{link}\n\n"
            "If you didn't request this, you can ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
