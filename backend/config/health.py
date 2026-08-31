"""Liveness / readiness probe. Public, unauthenticated, never throttled."""

from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse


def healthz(request):
    checks: dict[str, str] = {}
    healthy = True

    try:
        with connection.cursor() as cur:
            cur.execute("SELECT 1")
        checks["database"] = "ok"
    except Exception:  # noqa: BLE001
        checks["database"] = "error"
        healthy = False

    try:
        cache.set("_healthz", "1", 5)
        checks["cache"] = "ok" if cache.get("_healthz") == "1" else "degraded"
    except Exception:  # noqa: BLE001 - cache being down is not fatal
        checks["cache"] = "error"

    return JsonResponse(
        {"status": "ok" if healthy else "error", "checks": checks},
        status=200 if healthy else 503,
    )
