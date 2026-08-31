"""
Django settings for the brahmamudi backend.

Configuration is read from environment variables (see .env.example).
Local dev falls back to SQLite; staging/production use PostgreSQL via DATABASE_URL.
"""

from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DJANGO_DEBUG=(bool, False),
    DJANGO_ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    CORS_ALLOWED_ORIGINS=(list, ["http://localhost:3000", "http://127.0.0.1:3000"]),
)

# Read .env if present (not required in production where env vars are set directly).
env_file = BASE_DIR / ".env"
if env_file.exists():
    env.read_env(env_file)

SECRET_KEY = env("DJANGO_SECRET_KEY", default="django-insecure-dev-only-change-me")
DEBUG = env("DJANGO_DEBUG")
ALLOWED_HOSTS = env("DJANGO_ALLOWED_HOSTS")


# Application definition

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "django_filters",
    "corsheaders",
    "drf_spectacular",
]

LOCAL_APPS = [
    "apps.accounts",
    "apps.reference",
    "apps.profiles",
    "apps.memberships",
    "apps.payments",
    "apps.interests",
    "apps.moderation",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


# Database
DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default=f"sqlite:///{BASE_DIR / 'dev.sqlite3'}",
    ),
}
DATABASES["default"].setdefault("CONN_MAX_AGE", env.int("DB_CONN_MAX_AGE", default=60))


# Cache. Defaults to per-process local memory; set CACHE_URL (e.g.
# redis://localhost:6379/1) in production so rate-limit counters and cached
# stats are shared across worker processes.
CACHES = {
    "default": env.cache(
        "CACHE_URL",
        default="locmemcache://",
    ),
}


# Auth
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Legacy passwords were stored base64-encoded. On import we re-hash them with this
# hasher so members can keep their old password for one transitional login, then
# are forced to reset (User.must_reset_password).
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
]


# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = env("DJANGO_TIME_ZONE", default="Asia/Kolkata")
USE_I18N = True
USE_TZ = True


# Static & media
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Django REST Framework
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.LimitOffsetPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": env("THROTTLE_ANON", default="60/min"),
        "user": env("THROTTLE_USER", default="240/min"),
        "auth": env("THROTTLE_AUTH", default="20/min"),
        "password_reset": env("THROTTLE_PASSWORD_RESET", default="5/hour"),
        "interest_create": env("THROTTLE_INTEREST_CREATE", default="40/hour"),
        "contact_unlock": env("THROTTLE_CONTACT_UNLOCK", default="60/hour"),
        "porutham": env("THROTTLE_PORUTHAM", default="120/hour"),
        "photo_upload": env("THROTTLE_PHOTO_UPLOAD", default="30/hour"),
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_MINUTES", default=30)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("JWT_REFRESH_DAYS", default=14)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
    "UPDATE_LAST_LOGIN": True,
}

CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")


# OpenAPI schema (drf-spectacular) — served at /api/schema/, /api/docs/, /api/redoc/
SPECTACULAR_SETTINGS = {
    "TITLE": "brahmamudi API",
    "DESCRIPTION": "Matrimony platform API for the Vishwabrahmin community.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": "/api/v1",
    "COMPONENT_SPLIT_REQUEST": True,
    "ENUM_NAME_OVERRIDES": {
        "ProfileStatusEnum": "apps.reference.enums.ProfileStatus",
    },
}


# Google Sign-In (Google Identity Services). Empty = feature disabled.
GOOGLE_OAUTH_CLIENT_ID = env("GOOGLE_OAUTH_CLIENT_ID", default="")

# Member photo uploads: True = live immediately, False = hidden until staff
# approve them in the admin.
AUTO_APPROVE_PHOTOS = env.bool("AUTO_APPROVE_PHOTOS", default=True)

# Require a confirmed email before a member can create/edit a profile, send an
# interest, upload a photo or start a payment. Reads are always allowed.
REQUIRE_EMAIL_VERIFICATION = env.bool("REQUIRE_EMAIL_VERIFICATION", default=True)

# Member photos are re-encoded to JPEG and capped to this longest edge on upload
# and import (orientation baked in, metadata stripped).
PROFILE_PHOTO_MAX_SIDE = env.int("PROFILE_PHOTO_MAX_SIDE", default=1600)
PROFILE_PHOTO_QUALITY = env.int("PROFILE_PHOTO_QUALITY", default=85)
PROFILE_PHOTO_MAX_BYTES = env.int("PROFILE_PHOTO_MAX_BYTES", default=900_000)


# PayU payment gateway
PAYU_ENVIRONMENT = env("PAYU_ENVIRONMENT", default="staging")  # staging | production
PAYU_STAGING_BASE_URL = "https://test.payu.in"
PAYU_PRODUCTION_BASE_URL = "https://secure.payu.in"


# Email (interest notifications, password reset)
EMAIL_BACKEND = env(
    "DJANGO_EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend",
)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="no-reply@brahmamudi.com")
EMAIL_HOST = env("EMAIL_HOST", default="localhost")
EMAIL_PORT = env.int("EMAIL_PORT", default=25)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=False)
EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=False)
EMAIL_TIMEOUT = env.int("EMAIL_TIMEOUT", default=10)

# Base URL of the frontend, used to build links in transactional emails.
FRONTEND_BASE_URL = env("FRONTEND_BASE_URL", default="http://localhost:3000")
# Public base URL of this API, used for payment-gateway return URLs.
BACKEND_BASE_URL = env("BACKEND_BASE_URL", default="http://localhost:8000")
EMAIL_TOKEN_MAX_AGE_DAYS = env.int("EMAIL_TOKEN_MAX_AGE_DAYS", default=7)


# Security (enabled when DEBUG is off)
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=True)
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

LOG_JSON = env.bool("LOG_JSON", default=not DEBUG)
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{asctime} {levelname:<7} {name}  {message}",
            "style": "{",
        },
        "json": {"()": "config.logging.JSONFormatter"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json" if LOG_JSON else "verbose",
        },
    },
    "root": {"handlers": ["console"], "level": env("DJANGO_LOG_LEVEL", default="INFO")},
    "loggers": {
        # 4xx are noisy and expected; only surface 5xx from the request logger.
        "django.request": {"level": "ERROR", "propagate": True},
        "apps": {"level": env("APP_LOG_LEVEL", default="INFO"), "propagate": True},
    },
}


# Error tracking (Sentry). Empty DSN = disabled.
SENTRY_DSN = env("SENTRY_DSN", default="")
if SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=env("SENTRY_ENVIRONMENT", default="production"),
        release=env("SENTRY_RELEASE", default=None),
        traces_sample_rate=env.float("SENTRY_TRACES_SAMPLE_RATE", default=0.0),
        send_default_pii=env.bool("SENTRY_SEND_PII", default=False),
    )
