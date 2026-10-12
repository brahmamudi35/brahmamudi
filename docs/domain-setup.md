# Putting brahmamudi.com live

Target layout:

| Host | Serves | Hosted on |
|---|---|---|
| `brahmamudi.com` | Next.js site | Vercel |
| `www.brahmamudi.com` | redirect → `brahmamudi.com` | Vercel |
| `api.brahmamudi.com` | Django API + `/admin` + `/media` | Railway |
| `send.brahmamudi.com` | outgoing mail (Resend) — DNS records only | Resend |

All DNS records go in at your registrar's DNS panel. Copy the **exact values
each dashboard shows you** — the ones below are the usual shape, and Vercel /
Railway sometimes hand out project-specific targets.

## 0. Before you start

- **The old PHP site goes offline the moment the root records change.** Make
  sure everything you still need from the old server (dump, photos) is saved.
- Lower the TTL of the existing `@` and `www` records to 300 s a day ahead so the
  switch-over (and any rollback) propagates in minutes.
- **If you receive mail at @brahmamudi.com** (existing `MX` records on `@`),
  leave those `MX` and any SPF `TXT` on `@` alone. Resend uses the `send.`
  subdomain, so nothing here conflicts with them.

## 1. Frontend → Vercel

Vercel → project → **Settings → Domains** → add `brahmamudi.com` and
`www.brahmamudi.com` (choose "redirect www to apex"). Then at the registrar:

| Type | Name | Value |
|---|---|---|
| A | `@` | `76.76.21.21` (or what Vercel shows) |
| CNAME | `www` | `cname.vercel-dns.com` (or what Vercel shows) |

Delete any other `A`/`AAAA`/`CNAME` records on `@` and `www` (the old host). Vercel
issues the HTTPS certificate automatically once DNS resolves.

Vercel → **Settings → Environment Variables** (Production), then redeploy:

```
NEXT_PUBLIC_API_BASE_URL=https://api.brahmamudi.com/api/v1
NEXT_PUBLIC_DJANGO_ADMIN_URL=https://api.brahmamudi.com/<DJANGO_ADMIN_PATH>
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<unchanged>
```

## 2. API → Railway

Railway → backend service → **Settings → Networking → Custom Domain** → add
`api.brahmamudi.com`. Railway shows a CNAME target (and sometimes a TXT
verification record). At the registrar:

| Type | Name | Value |
|---|---|---|
| CNAME | `api` | `<something>.up.railway.app` (from Railway) |
| TXT | `_railway-verify.api` | (only if Railway asks for it) |

Railway → backend service → **Variables**:

```
DJANGO_ALLOWED_HOSTS=api.brahmamudi.com,<your-service>.up.railway.app
CSRF_TRUSTED_ORIGINS=https://api.brahmamudi.com
CORS_ALLOWED_ORIGINS=https://brahmamudi.com,https://www.brahmamudi.com
FRONTEND_BASE_URL=https://brahmamudi.com
BACKEND_BASE_URL=https://api.brahmamudi.com
DJANGO_ADMIN_PATH=<something non-obvious>/
```

Keep the `*.up.railway.app` host in `DJANGO_ALLOWED_HOSTS` until the new domain
is confirmed working, then you may drop it.

## 3. Email → Resend (sender `no-reply@brahmamudi.com`)

Resend → **Domains → Add domain** → `brahmamudi.com`, region closest to India
(e.g. Tokyo / ap-northeast-1). Resend lists 3–4 records; they look like:

| Type | Name | Value |
|---|---|---|
| TXT | `resend._domainkey` | `p=MIGfMA0G…` (DKIM — long key from Resend) |
| MX | `send` | `feedback-smtp.<region>.amazonses.com`, priority 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` |
| TXT | `_dmarc` | `v=DMARC1; p=none;` (recommended; skip if one exists) |

Click **Verify** in Resend (minutes to a few hours). Then on Railway:

```
RESEND_API_KEY=re_...            # already set
DEFAULT_FROM_EMAIL=brahmamudi <no-reply@brahmamudi.com>
```

Until the domain shows **Verified**, Resend only delivers to your own account
address — that's why codes to other members won't arrive yet.

## 4. Third-party consoles

- **Google Sign-In** — Cloud Console → Credentials → the OAuth client →
  *Authorised JavaScript origins*: add `https://brahmamudi.com` and
  `https://www.brahmamudi.com`.
- **PayU** — return URLs are built from `BACKEND_BASE_URL`
  (`https://api.brahmamudi.com/api/v1/payments/payu/return/`); if PayU's merchant
  panel whitelists domains, add `api.brahmamudi.com` and `brahmamudi.com`.

## 5. Check it

```
nslookup brahmamudi.com          # → Vercel IP
nslookup api.brahmamudi.com      # → Railway
curl https://api.brahmamudi.com/healthz   # {"status":"ok",...}
```

Then on the live site: register a new account → the 6-digit code email should
arrive from `no-reply@brahmamudi.com` (check it isn't in spam) → verify →
"Forgot password" → code → new password → sign in.
