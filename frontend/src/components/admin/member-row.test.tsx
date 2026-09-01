import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { ModerationProfile } from "@/lib/types";

import { MemberRow } from "./member-row";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function member(overrides: Partial<ModerationProfile> = {}): ModerationProfile {
  return {
    id: 42,
    regno: "BM000042",
    full_name: "Meena Rao",
    email: "meena@example.com",
    phone: "9000000000",
    gender: "F",
    age: 27,
    subcaste: "goldsmith",
    region: "telangana",
    marital_status: "unmarried",
    occupation: "Architect",
    designation: "",
    work_location: "",
    education_detail: "",
    country_living: "",
    status: "active",
    is_verified: false,
    plan: "Free",
    photo_count: 2,
    pending_photo_count: 1,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("<MemberRow>", () => {
  it("links the name and the Manage button to the member panel", () => {
    render(<MemberRow p={member()} busy={false} onAct={vi.fn()} />);
    const links = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(links).toContain("/admin/members/42");
  });

  it("shows a plan badge only for paid members", () => {
    const { rerender } = render(
      <MemberRow p={member()} busy={false} onAct={vi.fn()} />,
    );
    expect(screen.queryByText("Free")).toBeNull();
    rerender(
      <MemberRow p={member({ plan: "Gold" })} busy={false} onAct={vi.fn()} />,
    );
    expect(screen.getByText("Gold")).toBeInTheDocument();
  });

  it("fires verify then, once verified, unverify", async () => {
    const onAct = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <MemberRow p={member()} busy={false} onAct={onAct} />,
    );
    await user.click(screen.getByRole("button", { name: /verify/i }));
    expect(onAct).toHaveBeenCalledWith(42, "verify");

    rerender(
      <MemberRow p={member({ is_verified: true })} busy={false} onAct={onAct} />,
    );
    await user.click(screen.getByRole("button", { name: /unverify/i }));
    expect(onAct).toHaveBeenCalledWith(42, "unverify");
  });

  it("toggles suspend / reinstate on status", async () => {
    const onAct = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <MemberRow p={member()} busy={false} onAct={onAct} />,
    );
    await user.click(screen.getByRole("button", { name: /suspend/i }));
    expect(onAct).toHaveBeenCalledWith(42, "suspend");

    rerender(
      <MemberRow p={member({ status: "suspended" })} busy={false} onAct={onAct} />,
    );
    await user.click(screen.getByRole("button", { name: /reinstate/i }));
    expect(onAct).toHaveBeenCalledWith(42, "reinstate");
  });

  it("disables the action buttons while busy", () => {
    render(<MemberRow p={member()} busy onAct={vi.fn()} />);
    expect(screen.getByRole("button", { name: /verify/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /suspend/i })).toBeDisabled();
  });
});
