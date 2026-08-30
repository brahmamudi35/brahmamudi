"""PayU (PayU Money / PayUbiz) hashing and redirect helpers.

Request hash:
    sha512(key|txnid|amount|productinfo|firstname|email|udf1|...|udf5||||||salt)
Reverse (response) hash:
    sha512(salt|status||||||udf5|...|udf1|email|firstname|productinfo|amount|txnid|key)
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass

from django.conf import settings

from .models import PayUCredential, PaymentTransaction

_UDF_COUNT = 5


def _sha512(value: str) -> str:
    return hashlib.sha512(value.encode("utf-8")).hexdigest().lower()


@dataclass
class PayUConfig:
    key: str
    salt: str
    base_url: str

    @classmethod
    def active(cls) -> "PayUConfig":
        env = settings.PAYU_ENVIRONMENT
        cred = PayUCredential.objects.filter(environment=env, is_active=True).first()
        if cred is None:
            raise RuntimeError(f"No active PayU credential for environment '{env}'")
        base = (
            settings.PAYU_PRODUCTION_BASE_URL
            if env == "production"
            else settings.PAYU_STAGING_BASE_URL
        )
        return cls(key=cred.merchant_key, salt=cred.merchant_salt, base_url=base)


def build_request_hash(cfg: PayUConfig, *, txnid: str, amount: str, productinfo: str,
                       firstname: str, email: str, udf: list[str] | None = None) -> str:
    udf = (udf or []) + [""] * _UDF_COUNT
    parts = [cfg.key, txnid, amount, productinfo, firstname, email, *udf[:_UDF_COUNT]]
    parts += [""] * 6  # udf6-udf10 reserved, always empty
    parts.append(cfg.salt)
    return _sha512("|".join(parts))


def verify_response_hash(cfg: PayUConfig, data: dict) -> bool:
    udf = [data.get(f"udf{i}", "") for i in range(1, _UDF_COUNT + 1)]
    parts = [
        cfg.salt,
        data.get("status", ""),
        "", "", "", "", "", "",  # udf10-udf6 (reserved, empty)
        *reversed(udf),
        data.get("email", ""),
        data.get("firstname", ""),
        data.get("productinfo", ""),
        data.get("amount", ""),
        data.get("txnid", ""),
        cfg.key,
    ]
    expected = _sha512("|".join(parts))
    given = (data.get("hash") or "").lower()
    return hashlib.compare_digest(expected, given)


def _return_urls() -> tuple[str, str]:
    """Backend endpoint PayU redirects the browser back to (same for s/f)."""
    base = settings.BACKEND_BASE_URL.rstrip("/")
    url = f"{base}/api/v1/payments/payu/return/"
    return url, url


def create_checkout(*, profile, plan, first_name: str, email: str, phone: str,
                    ) -> tuple[PaymentTransaction, dict]:
    cfg = PayUConfig.active()
    surl, furl = _return_urls()
    txn = PaymentTransaction.objects.create(
        profile=profile,
        plan=plan,
        amount=plan.price_inr,
        product_info=plan.name,
        environment=settings.PAYU_ENVIRONMENT,
        first_name=first_name,
        email=email,
        phone=phone,
        surl=surl,
        furl=furl,
    )
    amount = f"{plan.price_inr:.2f}"
    txn.request_hash = build_request_hash(
        cfg, txnid=txn.txnid, amount=amount, productinfo=plan.name,
        firstname=first_name, email=email, udf=[str(profile.pk)],
    )
    txn.save(update_fields=["request_hash"])

    form = {
        "action": f"{cfg.base_url}/_payment",
        "key": cfg.key,
        "txnid": txn.txnid,
        "amount": amount,
        "productinfo": plan.name,
        "firstname": first_name,
        "email": email,
        "phone": phone,
        "surl": surl,
        "furl": furl,
        "udf1": str(profile.pk),
        "hash": txn.request_hash,
    }
    return txn, form


def activate_membership(txn: PaymentTransaction) -> None:
    """Grant the paid plan: supersede any active subscription, create a new one,
    and make the profile live. Safe to call again for the same txn."""
    from datetime import date

    from apps.memberships.models import Subscription

    if txn.subscriptions.filter(status=Subscription.Status.ACTIVE).exists():
        return

    start = date.today()
    expires = txn.plan.expiry_from(start)
    Subscription.objects.filter(
        profile=txn.profile, status=Subscription.Status.ACTIVE
    ).update(status=Subscription.Status.EXPIRED)
    Subscription.objects.create(
        profile=txn.profile,
        plan=txn.plan,
        status=Subscription.Status.ACTIVE,
        started_on=start,
        expires_on=expires,
        payment=txn,
    )
    profile = txn.profile
    profile.status = "active"
    if expires:
        profile.expires_on = expires
    profile.save(update_fields=["status", "expires_on"])


def apply_gateway_response(data: dict) -> PaymentTransaction:
    """Idempotently record a PayU success/failure callback and update the txn."""
    cfg = PayUConfig.active()
    txn = PaymentTransaction.objects.select_for_update().get(txnid=data["txnid"])

    if not verify_response_hash(cfg, data):
        txn.status = PaymentTransaction.Status.FAILURE
        txn.error_message = "hash verification failed"
        txn.raw_response = data
        txn.save()
        raise ValueError("PayU response hash verification failed")

    status_map = {
        "success": PaymentTransaction.Status.SUCCESS,
        "failure": PaymentTransaction.Status.FAILURE,
        "pending": PaymentTransaction.Status.PENDING,
    }
    txn.status = status_map.get(data.get("status", "").lower(), PaymentTransaction.Status.FAILURE)
    txn.mihpayid = data.get("mihpayid", "")
    txn.mode = data.get("mode", "")
    txn.unmapped_status = data.get("unmappedstatus", "")
    txn.bank_ref_num = data.get("bank_ref_num", "") or data.get("bankRefNum", "")
    txn.bankcode = data.get("bankcode", "")
    txn.pg_type = data.get("PG_TYPE", "") or data.get("pg_type", "")
    txn.response_hash = (data.get("hash") or "").lower()
    txn.error_code = data.get("error", "")
    txn.error_message = data.get("error_Message", "") or data.get("errorMessage", "")
    txn.raw_response = data
    txn.save()
    return txn
