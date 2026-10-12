from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        if extra.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True")
        if extra.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True")
        return self._create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    """Account holder. A member's matrimony bio-data lives on profiles.Profile."""

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    full_name = models.CharField(max_length=150, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    # Weekly match-activity digest email (apps.digests).
    email_digest = models.BooleanField(default=True)
    last_digest_sent_at = models.DateTimeField(null=True, blank=True, editable=False)

    # Google Sign-In: the stable Google account id ("sub" claim).
    google_sub = models.CharField(
        max_length=40, null=True, blank=True, unique=True, db_index=True
    )

    # Legacy migration bookkeeping (tbl_profiles.rid).
    legacy_rid = models.IntegerField(null=True, blank=True, unique=True, db_index=True)
    must_reset_password = models.BooleanField(
        default=False,
        help_text="Set for accounts imported with weak legacy passwords.",
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "account_user"

    def __str__(self):
        return self.email


class EmailOTP(models.Model):
    """A short-lived 6-digit code emailed for verification or password reset.

    Only an HMAC of the code is stored. Issuing a new code for the same
    (user, purpose) replaces the old one, so at most one is ever live.
    """

    class Purpose(models.TextChoices):
        VERIFY_EMAIL = "verify_email", "Verify email"
        PASSWORD_RESET = "password_reset", "Password reset"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="email_otps")
    purpose = models.CharField(max_length=20, choices=Purpose.choices)
    code_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "account_email_otp"
        indexes = [models.Index(fields=["user", "purpose"])]

    def __str__(self):
        return f"{self.user_id}:{self.purpose}"
