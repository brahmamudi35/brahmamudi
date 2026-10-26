import type { ApiError, AuthTokens } from "@/lib/types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

const ACCESS_KEY = "bm.access";
const REFRESH_KEY = "bm.refresh";

export function getTokens(): AuthTokens | null {
  if (typeof window === "undefined") return null;
  const access = localStorage.getItem(ACCESS_KEY);
  const refresh = localStorage.getItem(REFRESH_KEY);
  return access && refresh ? { access, refresh } : null;
}

export function setTokens(tokens: AuthTokens) {
  localStorage.setItem(ACCESS_KEY, tokens.access);
  localStorage.setItem(REFRESH_KEY, tokens.refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

function toApiError(status: number, body: unknown): ApiError {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (typeof b.detail === "string") return { status, detail: b.detail };
    // DRF field errors: { field: ["msg", ...] } or { non_field_errors: [...] }.
    // A nested serializer's errors ({ user: { email: [...] } }) are lifted to
    // their own keys, which is how the forms name those inputs.
    const fields: Record<string, string[]> = {};
    let first = "";
    const collect = (obj: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(obj)) {
        if (v && typeof v === "object" && !Array.isArray(v)) {
          collect(v as Record<string, unknown>);
          continue;
        }
        const msgs = Array.isArray(v) ? v.map(String) : [String(v)];
        fields[k] = msgs;
        if (!first) first = msgs[0];
      }
    };
    collect(b);
    return { status, detail: first || "Request failed.", fields };
  }
  return { status, detail: typeof body === "string" && body ? body : "Request failed." };
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

let refreshing: Promise<string | null> | null = null;

async function refreshAccess(): Promise<string | null> {
  const tokens = getTokens();
  if (!tokens) return null;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh: tokens.refresh }),
        });
        if (!res.ok) {
          // a rejected/expired refresh token ends the session; a server error doesn't
          if (res.status === 400 || res.status === 401 || res.status === 403) clearTokens();
          return null;
        }
        const data = (await res.json()) as { access: string; refresh?: string };
        setTokens({ access: data.access, refresh: data.refresh ?? tokens.refresh });
        return data.access;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean; // attach bearer token (default: true)
  raw?: boolean; // body is FormData / already-encoded; don't JSON.stringify
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { body, auth = true, raw = false, headers, ...rest } = options;

  const build = (token: string | null): RequestInit => {
    const h = new Headers(headers);
    if (!raw && body !== undefined) h.set("Content-Type", "application/json");
    if (auth && token) h.set("Authorization", `Bearer ${token}`);
    return {
      ...rest,
      headers: h,
      body:
        body === undefined
          ? undefined
          : raw
            ? (body as BodyInit)
            : JSON.stringify(body),
    };
  };

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  let token = auth ? (getTokens()?.access ?? null) : null;
  let res = await fetch(url, build(token));

  if (res.status === 401 && auth && getTokens()) {
    token = await refreshAccess();
    if (token) res = await fetch(url, build(token));
  }

  if (res.status === 204) return undefined as T;
  const parsed = await parseBody(res);
  if (!res.ok) throw toApiError(res.status, parsed);
  return parsed as T;
}
