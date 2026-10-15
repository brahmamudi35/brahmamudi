import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { AuthProvider, useAuth } from "./auth";

const { apiFetch, store } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  store: { tokens: null as null | { access: string; refresh: string } },
}));
vi.mock("./api", () => ({
  apiFetch,
  getTokens: () => store.tokens,
  setTokens: (t: { access: string; refresh: string }) => {
    store.tokens = t;
  },
  clearTokens: () => {
    store.tokens = null;
  },
}));

function Who() {
  const { user, loading } = useAuth();
  return <p>{loading ? "loading" : (user?.email ?? "signed out")}</p>;
}

beforeEach(() => {
  apiFetch.mockReset();
  store.tokens = { access: "a", refresh: "r" };
});
afterEach(() => vi.useRealTimers());

describe("AuthProvider session restore", () => {
  it("loads the signed-in member", async () => {
    apiFetch.mockResolvedValue({ email: "me@example.com" });
    render(<AuthProvider><Who /></AuthProvider>);
    expect(await screen.findByText("me@example.com")).toBeInTheDocument();
  });

  it("retries a dropped connection instead of signing the member out", async () => {
    apiFetch
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ email: "me@example.com" });
    render(<AuthProvider><Who /></AuthProvider>);
    expect(await screen.findByText("me@example.com", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(store.tokens).not.toBeNull();
  });

  it("keeps the tokens when the server stays unreachable", async () => {
    apiFetch.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<AuthProvider><Who /></AuthProvider>);
    expect(await screen.findByText("signed out", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(store.tokens).toEqual({ access: "a", refresh: "r" });
  });

  it("signs out on a real 401", async () => {
    apiFetch.mockRejectedValue({ status: 401, detail: "Unauthorized" });
    render(<AuthProvider><Who /></AuthProvider>);
    await waitFor(() => expect(screen.getByText("signed out")).toBeInTheDocument());
    expect(store.tokens).toBeNull();
    expect(apiFetch).toHaveBeenCalledTimes(1); // no pointless retries
  });
});
