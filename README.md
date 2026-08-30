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

- **Backend**: auth (JWT + email verification + password reset), profiles
  (CRUD/search/photos/partner-preference), memberships, PayU payments, interests,
  shortlist/visitors/contact-unlock quota, legacy importer. Complete for v1.
- **Frontend**: milestone 1 — landing, auth screens, profile-creation wizard,
  photo upload. Browse/search/interests/membership next.
