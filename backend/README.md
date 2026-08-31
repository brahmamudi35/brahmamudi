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
| `moderation` | Staff-only profile / photo moderation API |
| `messaging` | `Conversation`, `Message` between members whose interest was accepted |

## Tests

```bash
python manage.py test              # ~52 tests, SQLite, no extra services
```

## Rate limiting

DRF throttling is on by default (`config/throttling.py`). Anonymous 60/min,
authenticated 240/min, plus tighter scoped limits on auth, password reset,
interest-create, contact-unlock, porutham, photo-upload and message-send. Every
rate is overridable via a `THROTTLE_*` env var. Counters use the Django cache —
set `CACHE_URL` to a shared store (Redis) in production so they hold across
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
| GET | `conversations/` | my threads (`other`, `last_message`, `unread`) |
| POST | `conversations/` | `{profile}` → get-or-create a thread (403 unless accepted interest + `can_chat` plan) |
| GET/POST | `conversations/{id}/messages/` | GET marks incoming read; POST `{body}` |
| GET | `conversations/unread-count/` | `{unread}` |
| GET | `moderation/summary/` | staff: queue counts |
| GET | `moderation/profiles/?filter=…` | staff directory: `filter=` preset + `search`, `gender`, `subcaste`, `region`, `status`, `is_verified`, `age_min/max`, `has_photo`, `plan`, `joined_after`, `ordering` |
| POST | `moderation/profiles/{id}/verify\|unverify\|suspend\|reinstate/` | staff |
| GET | `moderation/photos/?filter=pending` | staff |
| POST | `moderation/photos/{id}/approve/` · DELETE `moderation/photos/{id}/` | staff: approve / reject |
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
