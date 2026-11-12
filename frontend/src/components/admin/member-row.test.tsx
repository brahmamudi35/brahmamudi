import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
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
    brahmamudi_no: "",
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
    render(<MemberRow p={member()} busy={false} onDelete={vi.fn()} />);
    const links = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(links).toContain("/admin/members/42");
  });

  it("shows a plan badge only for paid members", () => {
    const { rerender } = render(
      <MemberRow p={member()} busy={false} onDelete={vi.fn()} />,
    );
    expect(screen.queryByText("Free")).toBeNull();
    rerender(
      <MemberRow p={member({ plan: "Gold" })} busy={false} onDelete={vi.fn()} />,
    );
    expect(screen.getByText("Gold")).toBeInTheDocument();
  });

  it("has no verify or suspend options", () => {
    render(<MemberRow p={member()} busy={false} onDelete={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /verify|suspend|reinstate/i })).toBeNull();
  });

  it("deletes only after the confirmation", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<MemberRow p={member()} busy={false} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: "Delete profile" }));
    expect(onDelete).not.toHaveBeenCalled(); // asks first
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("can't be undone");
    await user.click(within(dialog).getByRole("button", { name: "Delete profile" }));
    expect(onDelete).toHaveBeenCalledWith(42);
  });

  it("disables delete while busy", () => {
    render(<MemberRow p={member()} busy onDelete={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Delete profile" })).toBeDisabled();
  });
});
