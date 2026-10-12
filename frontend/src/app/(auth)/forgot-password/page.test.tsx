import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ForgotPasswordPage from "./page";

const { apiFetch, replace } = vi.hoisted(() => ({ apiFetch: vi.fn(), replace: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: replace }) }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue({});
});

async function requestCode(email = "Me@Example.com") {
  render(<ForgotPasswordPage />);
  await userEvent.type(screen.getByLabelText(/Email/), email);
  await userEvent.click(screen.getByRole("button", { name: "Send code" }));
  await screen.findByText("Enter your code");
}

describe("forgot-password (email OTP)", () => {
  it("step 1 sends the email, step 2 sends code + new password", async () => {
    await requestCode();
    expect(apiFetch).toHaveBeenCalledWith("/auth/password/reset/", {
      method: "POST",
      auth: false,
      body: { email: "Me@Example.com" },
    });
    expect(screen.getByText("me@example.com")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/6-digit code/), "246810");
    await userEvent.type(screen.getByLabelText(/^New password/), "brand-new-pw-77");
    await userEvent.type(screen.getByLabelText(/^Confirm password/), "brand-new-pw-77");
    await userEvent.click(screen.getByRole("button", { name: "Set password" }));

    expect(await screen.findByText("Password set")).toBeInTheDocument();
    expect(apiFetch).toHaveBeenLastCalledWith("/auth/password/reset/confirm/", {
      method: "POST",
      auth: false,
      body: { email: "me@example.com", code: "246810", new_password: "brand-new-pw-77" },
    });
  });

  it("checks the passwords match before calling the API", async () => {
    await requestCode();
    apiFetch.mockClear();
    await userEvent.type(screen.getByLabelText(/6-digit code/), "246810");
    await userEvent.type(screen.getByLabelText(/^New password/), "brand-new-pw-77");
    await userEvent.type(screen.getByLabelText(/^Confirm password/), "different-pw-88");
    await userEvent.click(screen.getByRole("button", { name: "Set password" }));
    expect(await screen.findByText("Passwords don't match.")).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("shows the server's code error on the code field", async () => {
    await requestCode();
    apiFetch.mockRejectedValueOnce({
      status: 400,
      detail: "That code is incorrect. 4 attempts left.",
      fields: { code: ["That code is incorrect. 4 attempts left."] },
    });
    await userEvent.type(screen.getByLabelText(/6-digit code/), "000000");
    await userEvent.type(screen.getByLabelText(/^New password/), "brand-new-pw-77");
    await userEvent.type(screen.getByLabelText(/^Confirm password/), "brand-new-pw-77");
    await userEvent.click(screen.getByRole("button", { name: "Set password" }));
    expect(await screen.findByText("That code is incorrect. 4 attempts left.")).toBeInTheDocument();
  });

  it("can go back and use a different email", async () => {
    await requestCode();
    await userEvent.click(screen.getByRole("button", { name: "Use a different email" }));
    expect(screen.getByRole("button", { name: "Send code" })).toBeInTheDocument();
  });
});
