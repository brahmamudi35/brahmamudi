import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ShareProfile } from "./share-profile";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("ShareProfile", () => {
  beforeEach(() => apiFetch.mockReset());

  it("posts the typed numbers and lists who got it, unknowns and skips", async () => {
    apiFetch.mockResolvedValueOnce({
      sent: [{ id: 2, regno: "6221", name: "Ravi K" }],
      not_found: ["9999"],
      skipped: [{ id: 3, regno: "6240", name: "Sita", number: "6240", reason: "same gender" }],
    });
    const onSent = vi.fn();
    render(<ShareProfile profileId={7} onSent={onSent} />);

    const send = screen.getByRole("button", { name: /Send profile/ });
    expect(send).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Profile numbers"), "6221, 9999 6240");
    await userEvent.click(send);

    expect(apiFetch).toHaveBeenCalledWith("/moderation/profiles/7/share/", {
      method: "POST",
      body: { numbers: "6221, 9999 6240" },
    });
    expect(await screen.findByText("Ravi K (6221)")).toBeInTheDocument();
    expect(screen.getByText("9999")).toBeInTheDocument();
    expect(screen.getByText("Sita (6240): same gender")).toBeInTheDocument();
    expect(screen.getByLabelText("Profile numbers")).toHaveValue("");
    expect(onSent).toHaveBeenCalled();
  });

  it("shows the server's message and keeps the numbers on an error", async () => {
    apiFetch.mockRejectedValueOnce({ status: 400, detail: "Enter at least one profile number." });
    render(<ShareProfile profileId={7} />);
    await userEvent.type(screen.getByLabelText("Profile numbers"), "x");
    await userEvent.click(screen.getByRole("button", { name: /Send profile/ }));
    expect(await screen.findByText("Enter at least one profile number.")).toBeInTheDocument();
    expect(screen.getByLabelText("Profile numbers")).toHaveValue("x");
  });
});
