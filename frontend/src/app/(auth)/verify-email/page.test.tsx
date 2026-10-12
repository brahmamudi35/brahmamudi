import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import VerifyEmailPage from "./page";

const { apiFetch, refreshUser, auth, params } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  refreshUser: vi.fn(),
  auth: { user: null as null | Record<string, unknown>, loading: false },
  params: { value: new URLSearchParams() },
}));
vi.mock("@/lib/api", () => ({ apiFetch }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/navigation", () => ({ useSearchParams: () => params.value }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ ...auth, refreshUser }),
}));

beforeEach(() => {
  apiFetch.mockReset();
  auth.user = null;
  params.value = new URLSearchParams();
});

describe("verify-email page (code entry)", () => {
  it("signed-in member enters just the code", async () => {
    auth.user = { email: "me@example.com", email_verified: false, has_profile: false };
    apiFetch.mockResolvedValue({ detail: "Email verified." });
    render(<VerifyEmailPage />);

    expect(await screen.findByText("me@example.com")).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Email/)).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/6-digit code/), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Verify" }));

    expect(await screen.findByText("Email verified")).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith("/auth/email/verify/", {
      method: "POST",
      auth: false,
      body: { email: "me@example.com", code: "123456" },
    });
    expect(refreshUser).toHaveBeenCalled();
  });

  it("rejects a code that isn't 6 digits without calling the API", async () => {
    auth.user = { email: "me@example.com", email_verified: false };
    render(<VerifyEmailPage />);
    await userEvent.type(await screen.findByLabelText(/6-digit code/), "12a");
    await userEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(await screen.findByText("Enter the 6-digit code from the email.")).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("signed-out visitor also gives their email", async () => {
    apiFetch.mockResolvedValue({});
    params.value = new URLSearchParams("email=you@example.com");
    render(<VerifyEmailPage />);
    expect(screen.getByLabelText(/^Email/)).toHaveValue("you@example.com");
    await userEvent.type(screen.getByLabelText(/6-digit code/), "654321");
    await userEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(await screen.findByText("Email verified")).toBeInTheDocument();
    expect(apiFetch.mock.calls[0][1].body).toEqual({ email: "you@example.com", code: "654321" });
  });

  it("still honours an old ?token= link", async () => {
    apiFetch.mockResolvedValue({});
    params.value = new URLSearchParams("token=abc");
    render(<VerifyEmailPage />);
    expect(await screen.findByText("Email verified")).toBeInTheDocument();
    expect(apiFetch.mock.calls[0][1].body).toEqual({ token: "abc" });
  });
});
