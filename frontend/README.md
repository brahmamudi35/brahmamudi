# brahmamudi frontend

Next.js 16 (App Router) + Tailwind v4 + shadcn/ui (base-nova) client for the
brahmamudi matrimony API.

## Setup

```bash
npm install
cp .env.example .env.local        # point NEXT_PUBLIC_API_BASE_URL at the backend
npm run dev                        # http://localhost:3000
```

The backend must be running (default `http://localhost:8000/api/v1`) and must
allow `http://localhost:3000` in `CORS_ALLOWED_ORIGINS`.

## Structure

```
src/
  app/
    (marketing)/      public site: landing (SSR, pulls /stats/)
    (auth)/           login, register, verify-email, forgot/reset password
    (app)/            authenticated area (client-guarded in layout.tsx)
      dashboard/      onboarding status, profile summary
      onboarding/     8-step profile-creation wizard + photo step
      profile/photos/ standalone photo manager
  components/
    ui/               shadcn/ui primitives
    form/fields.tsx   RHF-bound TextField / SelectField / TextareaField
    site/             header, footer, logo, container
    onboarding/       PhotoManager
  lib/
    api.ts            fetch wrapper: JWT in localStorage, refresh-on-401
    auth.tsx          <AuthProvider> + useAuth()
    server-api.ts     server-component fetch for public data
    reference.ts      useReferenceData() — enums + nakshatram/raasi/education
    form.ts           maps DRF field errors onto react-hook-form
```

## Auth

Milestone 1 keeps the access + refresh JWT in `localStorage`; every authed page
is a client component and the `(app)` layout redirects to `/login?next=…` when
there is no session. Moving the refresh token to an httpOnly cookie (via a route
handler) is a planned hardening step.

## Milestone 1 scope

Landing · register (+ verification email) · login · password reset · profile
creation wizard (bio-data, horoscope, family, partner preference) · photo
upload. Browse / search / interests / membership come next.
