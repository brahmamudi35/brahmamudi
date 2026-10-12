import logging

from django.conf import settings
from django.db import transaction
from django.shortcuts import redirect
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, views
from rest_framework.response import Response

from apps.accounts.permissions import IsEmailVerified
from apps.memberships.models import MembershipPlan

from . import services
from .models import PaymentTransaction

logger = logging.getLogger(__name__)


@extend_schema(request=OpenApiTypes.OBJECT, responses={201: OpenApiTypes.OBJECT})
class PayUInitiateView(views.APIView):
    """Return the signed form fields the frontend POSTs to PayU."""

    permission_classes = [permissions.IsAuthenticated, IsEmailVerified]

    def post(self, request):
        profile = getattr(request.user, "profile", None)
        if profile is None:
            return Response({"detail": "Create a profile first."}, status=400)

        try:
            plan = MembershipPlan.objects.get(pk=request.data["plan"], is_active=True)
        except (KeyError, MembershipPlan.DoesNotExist):
            return Response({"detail": "Invalid plan."}, status=400)
        if plan.is_free:
            return Response({"detail": "The free plan needs no payment."}, status=400)

        try:
            txn, form = services.create_checkout(
                profile=profile,
                plan=plan,
                first_name=request.data.get("firstname") or profile.first_name,
                email=request.data.get("email") or request.user.email,
                phone=request.data.get("phone") or profile.contact_phone,
            )
        except RuntimeError:
            logger.exception("PayU checkout unavailable")
            return Response(
                {
                    "detail": "Online payment is temporarily unavailable. Please try again "
                    "later, or call / WhatsApp us on +91 82971 11166 to upgrade."
                },
                status=503,
            )
        return Response({"txnid": txn.txnid, "form": form}, status=201)


def _result_redirect(txn: PaymentTransaction | None):
    base = settings.FRONTEND_BASE_URL.rstrip("/")
    if txn is None:
        return redirect(f"{base}/payment/result?status=unknown")
    return redirect(f"{base}/payment/result?status={txn.status}&txnid={txn.txnid}")


@extend_schema(request=OpenApiTypes.OBJECT, responses={302: None})
@method_decorator(csrf_exempt, name="dispatch")
class PayUReturnView(views.APIView):
    """Browser lands here (form POST) after PayU. Process, then bounce to the UI."""

    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []
    throttle_classes: list = []  # PayU-driven; must never be rate-limited

    @transaction.atomic
    def post(self, request):
        data = {k: v for k, v in request.data.items()}
        try:
            txn = services.apply_gateway_response(data)
        except PaymentTransaction.DoesNotExist:
            return _result_redirect(None)
        except ValueError:
            txn = PaymentTransaction.objects.filter(txnid=data.get("txnid", "")).first()
            return _result_redirect(txn)

        if txn.status == PaymentTransaction.Status.SUCCESS and txn.profile and txn.plan:
            services.activate_membership(txn)
        return _result_redirect(txn)

    def get(self, request):
        return _result_redirect(None)


@extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
@method_decorator(csrf_exempt, name="dispatch")
class PayUWebhookView(views.APIView):
    """PayU server-to-server callback (form-encoded). Authoritative."""

    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []
    throttle_classes: list = []  # PayU-driven; must never be rate-limited

    @transaction.atomic
    def post(self, request):
        data = {k: v for k, v in request.data.items()}
        try:
            txn = services.apply_gateway_response(data)
        except PaymentTransaction.DoesNotExist:
            return Response({"detail": "Unknown transaction."}, status=404)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)

        if txn.status == PaymentTransaction.Status.SUCCESS and txn.profile and txn.plan:
            services.activate_membership(txn)
        return Response({"status": txn.status})
