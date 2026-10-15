import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { AppHeader } from "./app-header";

const { auth } = vi.hoisted(() => ({ auth: { user: null as null | Record<string, unknown> } }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: auth.user, logout: vi.fn() }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/dashboard",
}));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }) }));
vi.mock("@/components/notifications/notification-bell", () => ({
  NotificationBell: () => <button>notifications</button>,
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const navLabels = () =>
  within(screen.getByRole("navigation", { name: "Main" }))
    .getAllByRole("link")
    .map((a) => a.textContent);

beforeEach(() => {
  auth.user = null;
});

describe("<AppHeader>", () => {
  it("shows the member menu to members", () => {
    auth.user = { email: "m@example.com", is_staff: false, has_profile: true };
    render(<AppHeader />);
    expect(navLabels()).toEqual([
      "Matches", "Search", "Interests", "Shortlist", "Visitors", "Saved", "Membership",
    ]);
    expect(screen.getByText("notifications")).toBeInTheDocument();
  });

  it("shows only the desk to a staff account without a member profile", () => {
    auth.user = { email: "staff@example.com", is_staff: true, has_profile: false };
    render(<AppHeader />);
    expect(navLabels()).toEqual(["Admin", "Browse members"]);
    expect(screen.queryByText("notifications")).not.toBeInTheDocument();
  });

  it("gives staff who are also members both", () => {
    auth.user = { email: "both@example.com", is_staff: true, has_profile: true };
    render(<AppHeader />);
    expect(navLabels()).toContain("Matches");
    expect(navLabels().at(-1)).toBe("Admin");
  });
});
