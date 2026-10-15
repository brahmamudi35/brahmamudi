// Boots a throwaway Django API for the Playwright suite: fresh SQLite DB,
// temp media + email folders, seeded accounts, generous rate limits.
// Never touches the dev Postgres DB or production (seed_e2e refuses otherwise).
import { spawn, spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const BACKEND = join(here, "..", "..", "backend");
export const EMAIL_DIR = join(BACKEND, "e2e_emails");
const PORT = process.env.E2E_API_PORT ?? "8001";
const WEB = process.env.E2E_WEB_ORIGIN ?? "http://localhost:3100";

const venv = join(BACKEND, "..", ".venv");
// the repo's .venv locally; plain `python` on CI (or set E2E_PYTHON)
const python =
  process.env.E2E_PYTHON ??
  [join(venv, "Scripts", "python.exe"), join(venv, "bin", "python")].find((p) => existsSync(p)) ??
  "python";

const env = {
  ...process.env,
  E2E: "1",
  DJANGO_DEBUG: "true",
  DJANGO_SECRET_KEY: "e2e-not-secret-e2e-not-secret-e2e-not-secret-e2e",
  DATABASE_URL: `sqlite:///${join(BACKEND, "e2e.sqlite3").replace(/\\/g, "/")}`,
  MEDIA_ROOT: join(BACKEND, "e2e_media"),
  RESEND_API_KEY: "",
  DJANGO_EMAIL_BACKEND: "django.core.mail.backends.filebased.EmailBackend",
  EMAIL_FILE_PATH: EMAIL_DIR,
  CACHE_URL: "locmemcache://",
  CORS_ALLOWED_ORIGINS: WEB,
  FRONTEND_BASE_URL: WEB,
  BACKEND_BASE_URL: `http://localhost:${PORT}`,
  DJANGO_ALLOWED_HOSTS: "localhost,127.0.0.1",
  DJANGO_ADMIN_PATH: "admin/",
  GOOGLE_OAUTH_CLIENT_ID: "",
  PAYU_ENVIRONMENT: "staging",
  THROTTLE_ANON: "10000/min",
  THROTTLE_USER: "10000/min",
  THROTTLE_AUTH: "10000/min",
  THROTTLE_PASSWORD_RESET: "10000/min",
  THROTTLE_INTEREST_CREATE: "10000/min",
  THROTTLE_CONTACT_UNLOCK: "10000/min",
  THROTTLE_PORUTHAM: "10000/min",
  THROTTLE_PHOTO_UPLOAD: "10000/min",
  OTP_RESEND_COOLDOWN_SECONDS: "0",
  LOG_JSON: "false",
};

for (const p of ["e2e.sqlite3", "e2e_media", "e2e_emails"]) {
  rmSync(join(BACKEND, p), { recursive: true, force: true });
}

const manage = (...args) => {
  const r = spawnSync(python, ["manage.py", ...args], { cwd: BACKEND, env, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
manage("migrate", "--noinput", "-v", "0");
manage("seed_reference");
manage("seed_e2e");

const server = spawn(python, ["manage.py", "runserver", `127.0.0.1:${PORT}`, "--noreload"], {
  cwd: BACKEND,
  env,
  stdio: "inherit",
});
const stop = () => server.kill();
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
process.on("exit", stop);
