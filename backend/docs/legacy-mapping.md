# Legacy → new schema mapping

Source: `brahmamu_vbss.sql.gz` (MariaDB 10.11, MyISAM, latin1).
Row counts in the dump: profiles 1,392 · ProfileMembership 949 · PayuPostDetails 470 ·
PayuReturnDetails 100 · tbl_msg 2,811 · tbl_msgtypes 6 · MembershipPlan 4 · tbl_admin 3.

## tbl_profiles → accounts.User + profiles.Profile (+ PartnerPreference, ProfilePhoto)

| legacy column | new field | transform |
|---|---|---|
| `rid` | `Profile.legacy_rid`, `User.legacy_rid` | key for re-runs |
| `regno` | `Profile.regno` | trim; fallback to `str(rid)` if blank |
| `username` | `Profile.first_name` | legacy mixes name + qualifications — split on 2+ spaces, keep first token group as name, push remainder to `education_detail` |
| `surname` | `Profile.surname` | strip trailing status markers ("DIV", "Div- USA") |
| `emailid` | `User.email` | lowercase; dedupe — on collision suffix `+rid` |
| `passwd` | `User.password` | **base64-decode**, re-hash via Django, set `User.must_reset_password=True` |
| `gender` | `Profile.gender` | `M`/`F` kept as-is |
| `dob` | `Profile.date_of_birth` | `0000-00-00` → NULL |
| `mstatus` | `Profile.marital_status` | UM→unmarried, DV→divorced, WD→widowed, ST→separated |
| `mtongue` | `Profile.mother_tongue` | title-case; normalise telugu/telegu/TELUGU → "Telugu" |
| `height1` | `Profile.height_cm` | parse `feet.inches` (e.g. `5.11`, `6`, `5.6`) → cm; `height` (double) ignored, mostly 0 |
| `complexion` | `Profile.complexion` | lowercased lookup via `LEGACY_COMPLEXION`, else blank |
| `food_habits` | `Profile.food_habit` | V→veg, NV→nonveg |
| `gothram` | `Profile.gothram` | free text, kept verbatim |
| `nakshatram` | `Profile.nakshatram` (FK) | match against `Nakshatram.name` + `aliases` (case-insensitive) |
| `raasi` | `Profile.raasi` (FK) | match against `Raasi.name` + `aliases` |
| `paadam` | `Profile.paadam` | `''` → NULL; else int 1–4 |
| `timeofbirth`, `placeofbirth` | `Profile.time_of_birth`, `place_of_birth` | verbatim |
| `edu_qual` | `Profile.education_detail` | strip HTML |
| `Edu_code` | `Profile.education` (FK) | match `EducationLevel.legacy_code`; `0`/NULL → "Not specified" |
| `occupation`,`company`,`workplace`,`position` | `occupation`,`company`,`work_location`,`designation` | trim |
| `income` | `Profile.annual_income_text` | verbatim (free text like "30 Per Annum"); `annual_income_inr` left NULL |
| `assets` | `Profile.assets` | strip HTML |
| `citizenship` | `Profile.citizenship` | normalise indian/india/Indian → "Indian" |
| `cntry_living` | `Profile.country_living` | verbatim |
| `region` | `Profile.region` | Telangana/Andhra/Ralayaseema(typo)→rayalaseema |
| `native_dist`,`settled_at` | `native_district`,`settled_at` | verbatim |
| `caste` | `Profile.caste` | always "Vishwabrahmin" |
| `subcaste` | `Profile.subcaste` | Goldsmith/Carpenter/Blacksmith/Kanchari/Shilpi → lowercase slug |
| `father_name`,`father_pro`,`mother_name` | `father_name`,`father_occupation`,`mother_name` | verbatim |
| `family_bg` | `Profile.siblings` (JSON) + `family_background` | parse the `<table>` of Brothers/Sisters (edu, marital status) into rows; leftover prose → `family_background` |
| `address` | `Profile.address` | strip HTML/whitespace |
| `contact_no` | `Profile.contact_phone`, `parent_phone` | parse the Landline/Mobile/Parent Mobile `<table>` |
| `exp_qualities` | `Profile.expectations` + `PartnerPreference` | parse Age/Height/Edu `<table>` into `age_min/max`, `height_min/max_cm`, `education_categories`; raw HTML kept in `PartnerPreference.legacy_raw` |
| `other_details` | `Profile.about` | strip HTML |
| `partner_prefreg` | `PartnerPreference.regions` | single value list |
| `photo1`,`photo2` | `ProfilePhoto` rows | `legacy_filename` only — actual image files must be copied separately from the old server's upload dir |
| `showpic` | `Profile.photos_visible` | Y→true, N→false |
| `reg_date`,`exp_date` | `registered_on`,`expires_on` | varchar `YYYY-MM-DD` → date; junk → NULL |
| `status` | `Profile.status` | A→active, E→expired |
| `plan` | current `Subscription` | see below |
| `willingtous` | `Profile.willing_to_relocate_abroad` | Yes→true, No→false, NULL/NA/''→NULL |
| `divorce` | folded into `marital_status` cross-check (divorced) |
| all columns | `Profile.legacy_raw` (JSON) | full original row kept for auditing |

## MembershipPlan → memberships.MembershipPlan

Seeded by `seed_reference` with `legacy_id` 1–4. Legacy `duration` (months):
Free 0, Silver 6, Gold 12, Platinum 200 → Platinum treated as 12 (200 was a "lifetime" sentinel).

## ProfileMembership (rid, planid) + tbl_profiles.plan → memberships.Subscription

One `Subscription(is_legacy=True)` per profile using `tbl_profiles.plan` (more
current than `ProfileMembership`); `started_on = reg_date`, `expires_on = exp_date`,
`status = active` if `exp_date >= today` else `expired`.

## PayuPostDetails + PayuReturnDetails → payments.PaymentTransaction

Join on `txnid`. Post row seeds request side (key, amount, productinfo, firstname,
email, phone, surl, furl, hash). Return row (if present) fills gateway response
(mihpayid, mode, status, bankrefnum, bankcode, pgtype, error). `is_legacy=True`.
`status`: map PayU `status` string → enum; post-only rows with no return → `initiated`.

## tbl_msgtypes → interests.InterestTemplate

Seeded by `seed_reference` with `legacy_msgcatid` 1–6.

## tbl_msg → interests.Interest

`msg_fromid`/`msg_toid` → `sender`/`receiver` (resolve via `Profile.legacy_rid`;
skip rows whose profiles no longer exist). `msgcatid` → `template`.
`status`: `A`→sent, `IA`→withdrawn (kept in `legacy_status`). `msg_date`→`created_on`,
`0000-00-00`→NULL. `msg_text` (mostly NULL) → `message`.

## tbl_admin → accounts.User(is_staff=True, is_superuser=True)

`passwd` is unsalted SHA1 — cannot be re-used. Create staff users with
`set_unusable_password()` and `must_reset_password=True`; admins reset via email.
`uname` → derived email `<uname>@brahmamudi.com` unless a real email is known.

## Not in the dump / needs the old server

- Profile photo image files (`photo1`/`photo2` are filenames only)
- `tbl_payu_credentials` real production Key/Salt (dump has staging `JBZaLc`/`GQs7yium`)
- Any education-code lookup table (reconstructed best-effort in `reference/data.py`)
