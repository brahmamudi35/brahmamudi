"""Shared test helpers: a base APITestCase and object factories.

The base case clears the cache between tests so DRF throttle counters don't
leak from one test into the next.
"""

from __future__ import annotations

from datetime import date

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase

from apps.memberships.models import MembershipPlan, Subscription
from apps.profiles.models import Profile
from apps.reference.enums import Gender, ProfileStatus

User = get_user_model()

_counter = {"n": 0}


def _uid() -> int:
    _counter["n"] += 1
    return _counter["n"]


def make_user(email: str | None = None, password: str = "s3cret-pass-123", **extra) -> User:
    email = email or f"user{_uid()}@example.com"
    extra.setdefault("email_verified", True)  # the common case; override for gate tests
    return User.objects.create_user(email=email, password=password, **extra)


def make_profile(
    user: User | None = None,
    *,
    gender: str = Gender.MALE,
    status: str = ProfileStatus.ACTIVE,
    first_name: str = "Test",
    **extra,
) -> Profile:
    user = user or make_user()
    n = _uid()
    return Profile.objects.create(
        user=user,
        regno=extra.pop("regno", f"BM{n:06d}"),
        first_name=first_name,
        gender=gender,
        status=status,
        date_of_birth=extra.pop("date_of_birth", date(1995, 5, 17)),
        **extra,
    )


def give_subscription(profile: Profile, slug: str = "gold", **extra) -> Subscription:
    plan = MembershipPlan.objects.get(slug=slug)
    return Subscription.objects.create(
        profile=profile,
        plan=plan,
        status=Subscription.Status.ACTIVE,
        started_on=date.today(),
        expires_on=plan.expiry_from(date.today()),
        **extra,
    )


@override_settings(
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class ApiTestCase(APITestCase):
    """APITestCase that reseeds reference data once and clears cache per test."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        import logging

        # 4xx responses are asserted on all over the suite; don't log each one.
        logging.getLogger("django.request").setLevel(logging.ERROR)

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        import io

        from django.core.management import call_command

        call_command("seed_reference", verbosity=0, stdout=io.StringIO())

    def setUp(self):
        super().setUp()
        cache.clear()

    def auth(self, user: User):
        self.client.force_authenticate(user=user)
        return user
