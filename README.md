# brahmamudi

Rebuild of brahmamudi.com — matrimony site for the Vishwabrahmin (Vishwakarma)
community. Replaces the legacy PHP/MySQL `brahmamu_vbss` application.

| Path | What |
|------|------|
| [backend/](backend/) | Django 5.2 + DRF API, PostgreSQL. See [backend/README.md](backend/README.md). |
| [frontend/](frontend/) | Next.js 16 + Tailwind + shadcn/ui. See [frontend/README.md](frontend/README.md). |
| `brahmamu_vbss.sql.gz` | Legacy MariaDB dump (reference + import source). |

## Quick start

```bash
# backend
python -m venv .venv && .venv/Scripts/activate
pip install -r backend/requirements.txt
cd backend && cp .env.example .env
python manage.py migrate && python manage.py seed_reference
python manage.py import_legacy          # optional: load the 1,392 legacy profiles
python manage.py runserver

# frontend (separate terminal)
cd frontend && npm install
cp .env.example .env.local
npm run dev
```

## Status

- **Backend**: auth (JWT + Google + email verification + password reset),
  profiles (CRUD/search/photos/partner-preference), porutham compatibility,
  memberships, PayU payments, interests (+ notification emails + daily quota),
  shortlist/visitors/contact-unlock quota, member-to-member messaging, staff
  moderation API, DRF rate limiting, legacy importer. ~52 tests (`manage.py test`).
- **Frontend**: landing + auth + onboarding wizard; browse/search, profile
  detail with porutham card, interests, membership/PayU checkout, messaging,
  account, shortlist, visitors, staff `/admin` moderation page.
- **CI**: `.github/workflows/ci.yml` — backend tests + frontend typecheck/build.
- **Open**: PayU verified against live staging credentials (hash path is
  unit-tested); production SMTP + shared cache config.
