import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch, clearTokens, getTokens, setTokens } from "./api";
import type { ApiError } from "./types";

function jsonResponse(body: unknown, status = 200) {
  return new Response(body === null ? "" : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("token helpers", () => {
  afterEach(() => clearTokens());

  it("round-trips access + refresh through localStorage", () => {
    expect(getTokens()).toBeNull();
    setTokens({ access: "a", refresh: "r" });
    expect(getTokens()).toEqual({ access: "a", refresh: "r" });
  });

  it("returns null when only one token is present", () => {
    localStorage.setItem("bm.access", "a");
    expect(getTokens()).toBeNull();
  });
});

describe("apiFetch", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    clearTokens();
  });

  it("parses a JSON body on success", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 7, name: "Meena" }));
    await expect(apiFetch("/profiles/7/")).resolves.toEqual({ id: 7, name: "Meena" });
  });

  it("returns undefined for 204 No Content", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(apiFetch("/notifications/read/", { method: "POST" })).resolves.toBeUndefined();
  });

  it("attaches the bearer token and JSON content-type", async () => {
    setTokens({ access: "tok-123", refresh: "r" });
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch("/moderation/summary/");

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer tok-123");
  });

  it("does not attach a token when auth:false", async () => {
    setTokens({ access: "tok-123", refresh: "r" });
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch("/reference/enums/", { auth: false });

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Headers).get("Authorization")).toBeNull();
  });

  it("throws a normalised ApiError with `detail`", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Not found." }, 404));
    await expect(apiFetch("/profiles/999/")).rejects.toMatchObject({
      status: 404,
      detail: "Not found.",
    });
  });

  it("maps DRF field errors into `fields` and a first `detail`", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ email: ["Already taken."], phone: ["Too short."] }, 400),
    );
    const err = (await apiFetch("/auth/register/", { method: "POST" }).catch(
      (e) => e,
    )) as ApiError;
    expect(err.status).toBe(400);
    expect(err.detail).toBe("Already taken.");
    expect(err.fields).toEqual({
      email: ["Already taken."],
      phone: ["Too short."],
    });
  });

  it("refreshes once on 401 then retries the original request", async () => {
    setTokens({ access: "stale", refresh: "refresh-tok" });
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: "expired" }, 401)) // first call
      .mockResolvedValueOnce(jsonResponse({ access: "fresh" })) // refresh
      .mockResolvedValueOnce(jsonResponse({ id: 1 })); // retry

    await expect(apiFetch("/auth/me/")).resolves.toEqual({ id: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain("/auth/refresh/");
    expect(getTokens()).toEqual({ access: "fresh", refresh: "refresh-tok" });
    const retryHeaders = fetchMock.mock.calls[2][1].headers as Headers;
    expect(retryHeaders.get("Authorization")).toBe("Bearer fresh");
  });

  it("clears tokens and propagates 401 when the refresh fails", async () => {
    setTokens({ access: "stale", refresh: "bad" });
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: "expired" }, 401))
      .mockResolvedValueOnce(jsonResponse({ detail: "invalid" }, 401)); // refresh rejected

    await expect(apiFetch("/auth/me/")).rejects.toMatchObject({ status: 401 });
    expect(getTokens()).toBeNull();
  });
});
