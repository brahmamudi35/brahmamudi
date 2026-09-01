from django.conf import settings
from django.shortcuts import redirect
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import permissions, views

from .tokens import read_unsubscribe_token


class DigestUnsubscribeView(views.APIView):
    """One-click unsubscribe link target from the digest email footer."""

    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []

    @extend_schema(
        parameters=[OpenApiParameter("token", OpenApiTypes.STR, required=True)],
        responses={302: None},
    )
    def get(self, request):
        fe = settings.FRONTEND_BASE_URL.rstrip("/")
        user = read_unsubscribe_token(request.query_params.get("token", ""))
        if user is None:
            return redirect(f"{fe}/account?digest=invalid")
        if user.email_digest:
            user.email_digest = False
            user.save(update_fields=["email_digest"])
        return redirect(f"{fe}/account?digest=off")
