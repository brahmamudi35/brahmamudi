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
| `profiles` | `Profile` bio-data, photos, partner preference, views, shortlists |
| `memberships` | `MembershipPlan`, `Subscription` |
| `payments` | `PayUCredential`, `PaymentTransaction`, PayU hashing + webhook |
| `interests` | `InterestTemplate`, `Interest` (express-interest messaging) |

## API (v1)

Base path `/api/v1/`.

| Method | Path | Notes |
|--------|------|-------|
| POST | `auth/register/` | public; sends verification email |
| POST | `auth/login/` | returns `{access, refresh, user}` |
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
| POST | `profiles/{id}/unlock-contact/` | spends 1 contact credit; 402 if none |
| POST/DELETE | `profiles/{id}/shortlist/` | add / remove |
| GET | `membership-plans/` | public |
| GET | `membership-plans/my_subscription/` | `{subscription, contact_quota}` |
| POST | `payments/payu/initiate/` | returns signed PayU form fields |
| POST | `payments/payu/webhook/` | PayU S2S / redirect callback |
| GET | `interest-templates/` | public |
| GET/POST | `interests/?box=sent\|received` | |
| POST | `interests/{id}/accept\|decline\|withdraw/` | |
| GET | `reference/nakshatram/`, `reference/raasi/`, `reference/education-levels/` | public |

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
