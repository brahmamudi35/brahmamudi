# Enabling Google Sign-In

The "Continue with Google" buttons stay hidden until a Google OAuth client ID is
configured on both the backend and the frontend. One client ID is used for both.

## 1. Create the OAuth client

1. Go to <https://console.cloud.google.com/> → create (or pick) a project.
2. **APIs & Services → OAuth consent screen** — configure it:
   - User type: External
   - App name, support email, developer email
   - Scopes: just `openid`, `email`, `profile` (the defaults)
   - Add yourself as a test user while it's unpublished
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorised JavaScript origins**:
     - `http://localhost:3000` (dev)
     - your production frontend origin, e.g. `https://brahmamudi.com`
   - Authorised redirect URIs: *none needed* (we use the ID-token / GIS flow)
4. Copy the **Client ID** (looks like `1234567890-abc.apps.googleusercontent.com`).

## 2. Configure the apps

Backend — `backend/.env`:

```
GOOGLE_OAUTH_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
```

Frontend — `frontend/.env.local`:

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
```

Restart both dev servers. The Google buttons appear on `/login` and `/register`.

## How it works

1. The frontend renders Google's button via `@react-oauth/google`; on success it
   receives a signed **ID token**.
2. It POSTs `{ credential }` to `POST /api/v1/auth/google/`.
3. The backend verifies the token's signature, audience (`GOOGLE_OAUTH_CLIENT_ID`)
   and issuer with Google's public keys (`google-auth`), then:
   - links by Google `sub`, else by verified email, else creates a new user
     (`email_verified=True`, unusable password, `google_sub` stored);
   - returns our own `{ access, refresh, user }` JWT pair — identical to
     password login.
4. A Google-only account can add a password any time via the normal
   "Forgot password" flow.

## Production notes

- Publish the OAuth consent screen once you're past testing (test users are
  capped at 100).
- Keep the same client ID; just add the production origin to *Authorised
  JavaScript origins*.
- The client ID is not a secret (it ships in the frontend bundle); there is no
  client secret in this flow.
