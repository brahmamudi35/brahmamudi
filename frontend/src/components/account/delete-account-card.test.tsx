import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DeleteAccountCard } from "./delete-account-card";

const { apiFetch, logout, replace, auth } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  logout: vi.fn(),
  replace: vi.fn(),
  auth: { user: null as null | Record<string, unknown> },
}));
vi.mock("@/lib/api", () => ({ apiFetch }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: auth.user, logout }) }));

beforeEach(() => {
  apiFetch.mockReset();
  auth.user = { is_staff: false, has_usable_password: true };
});

async function openDialog() {
  await userEvent.click(screen.getByRole("button", { name: "Delete my account" }));
  return screen.findByRole("alertdialog");
}

describe("<DeleteAccountCard>", () => {
  it("is hidden for staff accounts", () => {
    auth.user = { is_staff: true, has_usable_password: true };
    const { container } = render(<DeleteAccountCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it("deletes with the password, then signs out and goes home", async () => {
    apiFetch.mockResolvedValue({ detail: "deleted" });
    render(<DeleteAccountCard />);
    await openDialog();
    await userEvent.type(screen.getByLabelText("Password"), "my-pw-123");
    await userEvent.click(screen.getByRole("button", { name: "Delete forever" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(apiFetch).toHaveBeenCalledWith("/auth/delete-account/", {
      method: "POST",
      body: { password: "my-pw-123" },
    });
    expect(logout).toHaveBeenCalled();
  });

  it("asks a passwordless (Google) account to type DELETE", async () => {
    auth.user = { is_staff: false, has_usable_password: false };
    apiFetch.mockResolvedValue({});
    render(<DeleteAccountCard />);
    await openDialog();
    await userEvent.type(screen.getByLabelText("Type DELETE"), "DELETE");
    await userEvent.click(screen.getByRole("button", { name: "Delete forever" }));
    await waitFor(() =>
      expect(apiFetch.mock.calls[0][1].body).toEqual({ confirm: "DELETE" }),
    );
  });

  it("shows a wrong-password error and keeps the user signed in", async () => {
    apiFetch.mockRejectedValue({
      status: 400,
      detail: "Password is incorrect.",
      fields: { password: ["Password is incorrect."] },
    });
    render(<DeleteAccountCard />);
    await openDialog();
    await userEvent.type(screen.getByLabelText("Password"), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Delete forever" }));
    expect(await screen.findByText("Password is incorrect.")).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
  });
});
