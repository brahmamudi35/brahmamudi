from django.db import transaction
from rest_framework import permissions, views
from rest_framework.response import Response

from apps.memberships.models import MembershipPlan, Subscription

from . import services
from .models import PaymentTransaction


class PayUInitiateView(views.APIView):
    """Return the signed form fields the frontend POSTs to PayU."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = getattr(request.user, "profile", None)
        if profile is None:
            return Response({"detail": "Create a profile first."}, status=400)

        try:
            plan = MembershipPlan.objects.get(pk=request.data["plan"], is_active=True)
        except (KeyError, MembershipPlan.DoesNotExist):
            return Response({"detail": "Invalid plan."}, status=400)
        if plan.is_free:
            return Response({"detail": "Free plan needs no payment."}, status=400)

        txn, form = services.create_checkout(
            profile=profile,
            plan=plan,
            first_name=request.data.get("firstname") or profile.first_name,
            email=request.data.get("email") or request.user.email,
            phone=request.data.get("phone") or profile.contact_phone,
            surl=request.data["surl"],
            furl=request.data["furl"],
        )
        return Response({"txnid": txn.txnid, "form": form}, status=201)


class PayUWebhookView(views.APIView):
    """PayU server-to-server / redirect callback (form-encoded)."""

    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []

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
            self._activate_membership(txn)
        return Response({"status": txn.status})

    @staticmethod
    def _activate_membership(txn: PaymentTransaction):
        from datetime import date

        start = date.today()
        Subscription.objects.filter(
            profile=txn.profile, status=Subscription.Status.ACTIVE
        ).update(status=Subscription.Status.EXPIRED)
        Subscription.objects.create(
            profile=txn.profile,
            plan=txn.plan,
            status=Subscription.Status.ACTIVE,
            started_on=start,
            expires_on=txn.plan.expiry_from(start),
            payment=txn,
        )
        profile = txn.profile
        profile.status = "active"
        if txn.plan.expiry_from(start):
            profile.expires_on = txn.plan.expiry_from(start)
        profile.save(update_fields=["status", "expires_on"])
