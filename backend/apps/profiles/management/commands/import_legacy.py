"""Import the legacy brahmamu_vbss dump into the new schema.

    python manage.py import_legacy --dump ../brahmamu_vbss.sql.gz
    python manage.py import_legacy --dump ../brahmamu_vbss.sql.gz --dry-run --limit 25

Idempotent: re-running updates existing rows (matched on legacy ids). See
docs/legacy-mapping.md for the field-by-field rationale.
"""

from __future__ import annotations

import datetime as dt
from collections import Counter
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.interests.models import Interest, InterestTemplate
from apps.memberships.models import MembershipPlan, Subscription
from apps.payments.models import PaymentTransaction
from apps.profiles.models import PartnerPreference, Profile
from apps.reference import enums
from apps.reference.data import legacy_edu_code
from apps.reference.models import EducationLevel, Nakshatram, Raasi
from tools.legacy_import import transforms as tf
from tools.legacy_import.dump_parser import iter_rows

User = get_user_model()

DEFAULT_DUMP = Path(__file__).resolve().parents[5] / "brahmamu_vbss.sql.gz"


class Command(BaseCommand):
    help = "Import the legacy brahmamu_vbss SQL dump."

    def add_arguments(self, parser):
        parser.add_argument("--dump", default=str(DEFAULT_DUMP))
        parser.add_argument("--limit", type=int, default=0, help="cap profiles (0 = all)")
        parser.add_argument("--dry-run", action="store_true")

    # -- orchestration ----------------------------------------------------

    def handle(self, *args, **opts):
        dump = Path(opts["dump"])
        if not dump.exists():
            raise CommandError(f"dump not found: {dump}")
        self.dump = dump
        self.limit = opts["limit"]
        self.dry_run = opts["dry_run"]
        self.stats: Counter = Counter()

        self._load_lookups()
        try:
            with transaction.atomic():
                self._import_profiles()
                self._import_subscriptions()
                self._import_payments()
                self._import_interests()
                self._import_admins()
                if self.dry_run:
                    self.stdout.write(self.style.WARNING("dry-run: rolling back"))
                    transaction.set_rollback(True)
        finally:
            self._report()

    def _load_lookups(self):
        self.plans = {p.legacy_id: p for p in MembershipPlan.objects.all() if p.legacy_id}
        self.plans_by_name = {p.name.lower(): p for p in MembershipPlan.objects.all()}
        self.edu = {e.legacy_code: e for e in EducationLevel.objects.all()}
        self.templates = {
            t.legacy_msgcatid: t for t in InterestTemplate.objects.all() if t.legacy_msgcatid
        }
        self.nak = self._alias_map(Nakshatram)
        self.raa = self._alias_map(Raasi)
        if not self.plans or not self.nak:
            raise CommandError("run `manage.py seed_reference` first")

    @staticmethod
    def _alias_map(model):
        out = {}
        for obj in model.objects.all():
            out[obj.name.lower()] = obj
            for alias in obj.aliases:
                out.setdefault(alias.lower(), obj)
        return out

    # -- profiles -------------------------------------------------------------

    def _import_profiles(self):
        used_emails = set(User.objects.values_list("email", flat=True))
        used_regnos = set(Profile.objects.values_list("regno", flat=True))
        self.profiles_by_rid: dict[int, Profile] = {}

        rows = iter_rows(self.dump, "tbl_profiles")
        for n, row in enumerate(rows):
            if self.limit and n >= self.limit:
                break
            rid = int(row["rid"])

            email = (row.get("emailid") or "").strip().lower()
            if not email or "@" not in email:
                email = f"legacy{rid}@brahmamudi.invalid"
            if email in used_emails:
                local, _, domain = email.partition("@")
                email = f"{local}+{rid}@{domain}"
            used_emails.add(email)

            # Legacy `passwd` is base64 of a guessable string (name+regno). We do
            # NOT carry it over: accounts get an unusable password and must reset
            # via email on first login. tf.decode_legacy_password stays available
            # for a one-off audit if ever needed.
            created = not User.objects.filter(legacy_rid=rid).exists()
            user, _ = User.objects.update_or_create(
                legacy_rid=rid,
                defaults=dict(
                    email=email,
                    phone="",
                    full_name=tf.clean(row.get("username"))[:150],
                    must_reset_password=True,
                    is_active=row.get("status") != "E",
                ),
            )
            if created:
                user.set_unusable_password()
                user.save(update_fields=["password"])

            name, extra_qual = tf.split_name(row.get("username"))
            regno = tf.clean(row.get("regno")) or f"L{rid}"
            if regno in used_regnos and regno != f"L{rid}":
                regno = f"{regno}-{rid}"
            used_regnos.add(regno)

            contact = tf.parse_contact(row.get("contact_no"))
            edu_code = _int_or_none(row.get("Edu_code"))
            edu_detail = " ".join(
                x for x in (tf.strip_html(row.get("edu_qual")), extra_qual) if x
            ).strip()

            profile, _ = Profile.objects.update_or_create(
                legacy_rid=rid,
                defaults=dict(
                    user=user,
                    regno=regno,
                    first_name=(name or tf.clean(row.get("username")) or "Member")[:120],
                    surname=tf.clean_surname(row.get("surname"))[:120],
                    gender=row.get("gender") if row.get("gender") in ("M", "F") else "M",
                    date_of_birth=tf.parse_date(row.get("dob")),
                    marital_status=enums.LEGACY_MARITAL_STATUS.get(
                        (row.get("mstatus") or "").strip().upper(), ""
                    ),
                    mother_tongue=tf.normalize_mtongue(row.get("mtongue")),
                    height_cm=tf.height_to_cm(row.get("height1")),
                    complexion=enums.LEGACY_COMPLEXION.get(
                        tf.clean(row.get("complexion")).lower(), ""
                    ),
                    food_habit=enums.LEGACY_FOOD_HABIT.get(
                        (row.get("food_habits") or "").strip().upper(), ""
                    ),
                    caste="Vishwabrahmin",
                    subcaste=_subcaste(row.get("subcaste")),
                    gothram=tf.clean(row.get("gothram"))[:120],
                    nakshatram=self.nak.get(tf.clean(row.get("nakshatram")).lower()),
                    raasi=self.raa.get(tf.clean(row.get("raasi")).lower()),
                    paadam=_int_or_none(row.get("paadam")) or None,
                    time_of_birth=tf.clean(row.get("timeofbirth"))[:30],
                    place_of_birth=tf.clean(row.get("placeofbirth"))[:120],
                    education=self.edu.get(legacy_edu_code(edu_code)),
                    education_detail=edu_detail,
                    occupation=tf.clean(row.get("occupation"))[:150],
                    company=tf.clean(row.get("company"))[:200],
                    work_location=tf.clean(row.get("workplace"))[:200],
                    designation=tf.clean(row.get("position"))[:200],
                    annual_income_text=tf.clean(row.get("income"))[:120],
                    assets=tf.strip_html(row.get("assets")),
                    citizenship=tf.normalize_citizenship(row.get("citizenship"))[:80],
                    country_living=tf.clean(row.get("cntry_living"))[:80],
                    native_district=tf.clean(row.get("native_dist"))[:80],
                    settled_at=tf.clean(row.get("settled_at"))[:80],
                    region=enums.LEGACY_REGION.get(tf.clean(row.get("region")).lower(), ""),
                    address=tf.strip_html(row.get("address")),
                    father_name=tf.clean(row.get("father_name"))[:150],
                    father_occupation=tf.clean(row.get("father_pro"))[:200],
                    mother_name=tf.clean(row.get("mother_name"))[:150],
                    family_background=tf.strip_html(row.get("family_bg")),
                    siblings=tf.parse_siblings(row.get("family_bg")),
                    about=tf.strip_html(row.get("other_details")),
                    expectations=tf.strip_html(row.get("exp_qualities")),
                    contact_phone=contact["mobile"][:40],
                    parent_phone=contact["parent_mobile"][:40],
                    contact_notes=contact["landline"],
                    status=enums.LEGACY_PROFILE_STATUS.get(row.get("status"), "active"),
                    photos_visible=row.get("showpic") != "N",
                    willing_to_relocate_abroad=tf.parse_bool(row.get("willingtous")),
                    registered_on=tf.parse_date(row.get("reg_date")),
                    expires_on=tf.parse_date(row.get("exp_date")),
                    legacy_raw=row,
                ),
            )
            self.profiles_by_rid[rid] = profile
            self.stats["profiles"] += 1

            pref = tf.parse_expectations(row.get("exp_qualities"))
            partner_reg = tf.clean(row.get("partner_prefreg"))
            PartnerPreference.objects.update_or_create(
                profile=profile,
                defaults=dict(
                    age_min=pref.get("age_min"),
                    age_max=pref.get("age_max"),
                    height_min_cm=pref.get("height_min_cm"),
                    height_max_cm=pref.get("height_max_cm"),
                    regions=[partner_reg] if partner_reg else [],
                    notes=pref.get("notes", ""),
                    legacy_raw=pref.get("legacy_raw", ""),
                ),
            )
            for col in ("photo1", "photo2"):
                if tf.clean(row.get(col)):
                    self.stats["photo_filenames (not migrated - images absent)"] += 1

    # -- subscriptions ------------------------------------------------------

    def _import_subscriptions(self):
        today = dt.date.today()
        for rid, profile in self.profiles_by_rid.items():
            raw = profile.legacy_raw
            plan = self.plans.get(_int_or_none(raw.get("plan")))
            if plan is None:
                continue
            start = tf.parse_date(raw.get("reg_date"))
            end = tf.parse_date(raw.get("exp_date"))
            active = plan.is_free or (end is None) or (end >= today)
            Subscription.objects.update_or_create(
                profile=profile,
                is_legacy=True,
                defaults=dict(
                    plan=plan,
                    started_on=start,
                    expires_on=end,
                    status=Subscription.Status.ACTIVE if active else Subscription.Status.EXPIRED,
                ),
            )
            self.stats["subscriptions"] += 1

    # -- payments ---------------------------------------------------------

    def _import_payments(self):
        by_txn: dict[str, PaymentTransaction] = {}
        for row in iter_rows(self.dump, "PayuPostDetails"):
            txnid = (row.get("txnid") or "").strip()
            if not txnid:
                continue
            profile = self.profiles_by_rid.get(_int_or_none(row.get("profid")))
            plan = self.plans_by_name.get((row.get("productinfo") or "").strip().lower())
            txn, _ = PaymentTransaction.objects.update_or_create(
                txnid=txnid,
                defaults=dict(
                    profile=profile,
                    plan=plan,
                    amount=_decimal(row.get("amount")),
                    product_info=tf.clean(row.get("productinfo"))[:120],
                    first_name=tf.clean(row.get("firstname"))[:80],
                    email=(row.get("email") or "")[:254],
                    phone=tf.clean(row.get("phone"))[:20],
                    surl=(row.get("surl") or "")[:200],
                    furl=(row.get("furl") or "")[:200],
                    request_hash=(row.get("hash") or "")[:255],
                    status=PaymentTransaction.Status.INITIATED,
                    environment="production",
                    is_legacy=True,
                    raw_request=row,
                ),
            )
            by_txn[txnid] = txn
            self.stats["payments (post)"] += 1

        status_map = {
            "success": PaymentTransaction.Status.SUCCESS,
            "failure": PaymentTransaction.Status.FAILURE,
            "pending": PaymentTransaction.Status.PENDING,
        }
        for row in iter_rows(self.dump, "PayuReturnDetails"):
            txnid = (row.get("txnid") or "").strip()
            txn = by_txn.get(txnid)
            if txn is None:
                continue
            txn.status = status_map.get(
                (row.get("status") or "").strip().lower(), PaymentTransaction.Status.FAILURE
            )
            txn.mihpayid = tf.clean(row.get("mihpayid"))[:40]
            txn.mode = tf.clean(row.get("mode"))[:10]
            txn.unmapped_status = tf.clean(row.get("unmappedstatus"))[:50]
            txn.bank_ref_num = tf.clean(row.get("bankrefnum"))[:40]
            txn.bankcode = tf.clean(row.get("bankcode"))[:30]
            txn.pg_type = tf.clean(row.get("pgtype"))[:20]
            txn.response_hash = (row.get("hash") or "")[:255]
            txn.error_code = tf.clean(row.get("error"))[:20]
            txn.error_message = tf.clean(row.get("errormessage"))[:120]
            txn.raw_response = row
            completed = tf.parse_date(row.get("addedon"))
            if completed:
                txn.completed_at = timezone.make_aware(
                    dt.datetime.combine(completed, dt.time())
                )
            txn.save()
            self.stats["payments (return)"] += 1

    # -- interests -------------------------------------------------------------

    def _import_interests(self):
        status_map = {"A": Interest.Status.SENT, "IA": Interest.Status.WITHDRAWN}
        for row in iter_rows(self.dump, "tbl_msg"):
            sender = self.profiles_by_rid.get(_int_or_none(row.get("msg_fromid")))
            receiver = self.profiles_by_rid.get(_int_or_none(row.get("msg_toid")))
            if not sender or not receiver or sender == receiver:
                self.stats["interests skipped (missing profile)"] += 1
                continue
            Interest.objects.update_or_create(
                legacy_mid=int(row["mid"]),
                defaults=dict(
                    sender=sender,
                    receiver=receiver,
                    template=self.templates.get(_int_or_none(row.get("msgcatid"))),
                    message=tf.clean(row.get("msg_text"))[:255],
                    status=status_map.get(row.get("status"), Interest.Status.SENT),
                    legacy_status=row.get("status") or "",
                    created_on=tf.parse_date(row.get("msg_date")),
                ),
            )
            self.stats["interests"] += 1

    # -- admins ---------------------------------------------------------------

    def _import_admins(self):
        for row in iter_rows(self.dump, "tbl_admin"):
            uname = tf.clean(row.get("uname"))
            if not uname:
                continue
            email = uname if "@" in uname else f"{uname}@brahmamudi.com"
            user, _ = User.objects.update_or_create(
                email=email.lower(),
                defaults=dict(
                    full_name=uname,
                    is_staff=True,
                    is_superuser=True,
                    is_active=True,
                    must_reset_password=True,
                ),
            )
            user.set_unusable_password()
            user.save(update_fields=["password"])
            self.stats["admins"] += 1

    # -- reporting ----------------------------------------------------------

    def _report(self):
        self.stdout.write("")
        for key, val in sorted(self.stats.items()):
            self.stdout.write(f"  {key:40s} {val}")
        self.stdout.write(self.style.SUCCESS("done" if not self.dry_run else "dry-run done"))


def _int_or_none(value):
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def _decimal(value):
    try:
        return round(float(str(value).strip() or 0), 2)
    except (TypeError, ValueError):
        return 0


def _subcaste(value):
    v = tf.clean(value).lower()
    valid = {c for c, _ in enums.SubCaste.choices}
    return v if v in valid else ""
