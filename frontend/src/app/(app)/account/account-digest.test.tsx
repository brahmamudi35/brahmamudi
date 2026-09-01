import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { User } from "@/lib/types";

import AccountPage from "./page";

const { apiFetch, refreshUser, useAuth } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  refreshUser: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ apiFetch }));
vi.mock("@/lib/auth", () => ({ useAuth }));
vi.mock("@/lib/form", () => ({ handleApiError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

function mockUser(over: Partial<User> = {}): User {
  return {
    id: 1,
    email: "a@b.com",
    phone: "",
    full_name: "A B",
    is_staff: false,
    is_superuser: false,
    email_verified: true,
    email_digest: true,
    must_reset_password: false,
    date_joined: "2026-01-01T00:00:00Z",
    has_profile: true,
    google_linked: false,
    has_usable_password: true,
    ...over,
  };
}

beforeEach(() => {
  apiFetch.mockReset().mockResolvedValue({});
  refreshUser.mockReset().mockResolvedValue(undefined);
  useAuth.mockReturnValue({ user: mockUser(), refreshUser });
});

describe("account – weekly digest preference", () => {
  it("reflects the user's current opt-in state", () => {
    render(<AccountPage />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("shows unchecked when the user has opted out", () => {
    useAuth.mockReturnValue({ user: mockUser({ email_digest: false }), refreshUser });
    render(<AccountPage />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("PATCHes /auth/me/ and refreshes when toggled off", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(screen.getByRole("checkbox"));

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith("/auth/me/", {
        method: "PATCH",
        body: { email_digest: false },
      }),
    );
    expect(refreshUser).toHaveBeenCalled();
  });
});
