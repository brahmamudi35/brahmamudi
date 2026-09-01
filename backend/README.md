# brahmamudi backend

Django 5.2 + DRF API for the brahmamudi matrimony site (rebuild of the legacy
PHP/MySQL `brahmamu_vbss` application).

## Stack

- Python 3.14, Django 5.2 LTS, Django REST Framework
- PostgreSQL (prod/staging) — local dev falls back to SQLite
- JWT auth (`djangorestframework-simplejwt`)
- PayU payment gateway

## Local setup

```bash
python -m venv .venv
.venv/Scripts/activate        # Windows;  source .venv/bin/activate on *nix
pip install -r backend/requirements.txt

cd backend
cp .env.example .env          # then edit DJANGO_SECRET_KEY etc.
python manage.py migrate
python manage.py seed_reference       # nakshatram, raasi, plans, interest templates
python manage.py createsuperuser
python manage.py runserver
```

### Two admin tiers

* **Super admin** — the Django admin at `/<DJANGO_ADMIN_PATH>` (default `admin/`).
  Superusers only (`is_superuser`); full model access + the audit log. Set
  `DJANGO_ADMIN_PATH` to something non-obvious in production. Failed logins are
  rate-limited per IP (`ADMIN_LOGIN_MAX_ATTEMPTS` / `ADMIN_LOGIN_LOCKOUT_SECONDS`).
* **Admin** — staff (`is_staff`) run the member desk from the frontend `/admin`
  page, backed by the `moderation` API: moderation queues, member directory,
  editing a member's bio-data, comping a membership, and the payment ledger.

To use PostgreSQL, set `DATABASE_URL` in `.env`:

```
DATABASE_URL=postgres://brahmamudi:brahmamudi@localhost:5432/brahmamudi
```

## Apps

| App | Responsibility |
|-----|----------------|
| `accounts` | Custom `User` (email login), registration, JWT |
| `reference` | Nakshatram, Raasi, EducationLevel lookups + fixed enums |
| `profiles` | `Profile` bio-data, photos, partner preference, views, shortlists, porutham scoring |
| `memberships` | `MembershipPlan`, `Subscription` |
| `payments` | `PayUCredential`, `PaymentTransaction`, PayU hashing + return/webhook |
| `interests` | `InterestTemplate`, `Interest`, notification emails, daily send quota |
| `moderation` | Staff member desk: moderation, directory, profile edit, comp-a-plan, payment ledger |
| `notifications` | In-app `Notification` feed + triggers (interests, views, moderation, payment) |
| `alerts` | `SavedSearch` + the `send_search_alerts` command |

## Tests

```bash
python manage.py test              # ~103 tests, SQLite, no extra services
```

## Scheduled jobs

`send_search_alerts` emails + notifies members when new profiles match a saved
search. Run it on a schedule (cron / systemd timer / CI), e.g. hourly:

```cron
0 * * * *  cd /srv/brahmamudi/backend && ../.venv/bin/python manage.py send_search_alerts
```

## Rate limiting

DRF throttling is on by default (`config/throttling.py`). Anonymous 60/min,
authenticated 240/min, plus tighter scoped limits on auth, password reset,
interest-create, contact-unlock, porutham and photo-upload. Every rate is
overridable via a `THROTTLE_*` env var. Counters use the Django cache — set
`CACHE_URL` to a shared store (Redis) in production so they hold across
processes.

## API (v1)

Base path `/api/v1/`.

| Method | Path | Notes |
|--------|------|-------|
| POST | `auth/register/` | public; sends verification email |
| POST | `auth/login/` | returns `{access, refresh, user}` |
| GET/POST | `auth/google/` | GET `{enabled}`; POST `{credential}` → `{access, refresh, user, created}` (see [docs/google-signin-setup.md](docs/google-signin-setup.md)) |
| POST | `auth/refresh/` | |
| GET/PATCH | `auth/me/` | current user (patch: phone, full_name) |
| POST | `auth/password/change/` | authenticated |
| POST | `auth/password/reset/` | `{email}` — always 200 |
| POST | `auth/password/reset/confirm/` | `{uid, token, new_password}` |
| POST | `auth/email/verify/` | `{token}` |
| POST | `auth/email/verify/resend/` | `{email}` |
| GET | `profiles/` | browse (opposite gender, filtered) |
| GET | `profiles/{id}/` | detail; records a visit; contact fields gated |
| GET/POST/PUT/PATCH | `profiles/me/` | own profile (POST creates it) |
| GET/POST/DELETE | `profiles/me/horoscope/` | jataka PDF/image (one per profile) |
| GET | `profiles/me/contact-quota/` | remaining contact views |
| GET | `profiles/me/visitors/` | who viewed me |
| GET | `profiles/me/viewed/` | profiles I viewed |
| GET | `profiles/me/shortlist/` | my shortlist |
| GET | `profiles/me/completeness/` | weighted 0-100 score + missing sections |
| GET | `profiles/suggestions/` | preference + porutham ranked matches (`?limit=`) |
| POST | `profiles/{id}/unlock-contact/` | spends 1 contact credit; 402 if none |
| POST/DELETE | `profiles/{id}/shortlist/` | add / remove |
| GET | `profiles/{id}/porutham/` | ten-porutham compatibility vs the caller (bride/groom by gender) |
| GET | `membership-plans/` | public |
| GET | `membership-plans/my_subscription/` | `{subscription, contact_quota}` |
| POST | `payments/payu/initiate/` | returns signed PayU form fields |
| GET/POST | `payments/payu/return/` | browser lands here after PayU; processes, then 302s to `FRONTEND_BASE_URL/payment/result` |
| POST | `payments/payu/webhook/` | PayU server-to-server callback (authoritative) |
| GET | `interest-templates/` | public |
| GET/POST | `interests/?box=sent\|received` | POST notifies the receiver by email |
| GET | `interests/quota/` | sender's daily interest allowance / remaining |
| POST | `interests/{id}/accept\|decline\|withdraw/` | accept/decline email the sender |
| GET | `moderation/summary/` | staff: queue + desk counts (`total_members`, `paid_members`, `payments_succeeded_this_month`, …) |
| GET | `moderation/profiles/?filter=…` | staff directory: `filter=` preset + `search`, `gender`, `subcaste[]`, `region[]`, `education[]`, `marital_status[]`, `status[]`, `is_verified`, `age_min/max`, `has_photo`, `plan`, `designation`, `work_location`, `joined_after`, `ordering` |
| GET | `moderation/profiles/{id}/` | staff: full member panel (photos, horoscope, subscriptions, completeness, activity) |
| PATCH | `moderation/profiles/{id}/` | staff: edit bio-data on the member's behalf; nested `user` = `email`/`phone`/`full_name`/`email_verified` |
| POST | `moderation/profiles/{id}/verify\|unverify\|suspend\|reinstate/` | staff |
| POST | `moderation/profiles/{id}/grant-plan/` | staff: comp a membership — `{plan: <slug>, months?: <int>}` (supersedes the active subscription) |
| GET | `moderation/profiles/{id}/subscriptions/` | staff: that member's subscription history |
| POST | `moderation/subscriptions/{id}/revoke/` | staff: cancel a subscription |
| GET | `moderation/payments/?status=…&plan=…&profile=…&created_after=…` | staff: read-only payment ledger, `search` by txn id / PayU id / email / phone / reg. no |
| GET | `moderation/photos/?filter=pending` | staff |
| POST | `moderation/photos/{id}/approve/` · DELETE `moderation/photos/{id}/` | staff: approve / reject |
| GET | `moderation/horoscopes/?filter=pending` · POST `{id}/approve/` · DELETE `{id}/` | staff: horoscope queue |
| GET | `notifications/` · `notifications/unread-count/` | my in-app notifications |
| POST | `notifications/read/` | `{ids?: [...]}` — omit `ids` to mark all read |
| GET/POST | `saved-searches/` · GET/PATCH/DELETE `saved-searches/{id}/` | my saved searches |
| GET | `saved-searches/{id}/results/` | run the saved search now (paginated) |
| GET | `reference/nakshatram/`, `reference/raasi/`, `reference/education-levels/` | public |

Interest and porutham details, plus `AUTO_APPROVE_PHOTOS` (photos live on upload
unless set false), are covered by the test suite.

Transactional emails (verification, password reset) link to
`FRONTEND_BASE_URL/verify-email?token=…` and
`FRONTEND_BASE_URL/reset-password?uid=…&token=…`. Dev uses the console email
backend, so the links print to the runserver output.

### Legacy photos

Once the original image files are recovered from the old server:

```bash
python manage.py import_legacy_photos --source /path/to/old/uploads
```

## Legacy data migration

See [tools/legacy_import/README.md](tools/legacy_import/README.md). The legacy
dump is `../brahmamu_vbss.sql.gz`. Schema/field mapping notes live in
[docs/legacy-mapping.md](docs/legacy-mapping.md).
