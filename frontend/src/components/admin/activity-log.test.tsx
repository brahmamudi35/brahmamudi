import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { StaffAction } from "@/lib/types";

import { ActivityLog, describeAction } from "./activity-log";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch }));

const action = (o: Partial<StaffAction>): StaffAction => ({
  id: 1,
  actor_email: "desk@brahmamudi.com",
  action: "verify",
  profile_id: 7,
  profile_regno: "BM000007",
  data: {},
  created_at: "2026-10-12T10:00:00Z",
  ...o,
});

beforeEach(() => apiFetch.mockReset());

describe("describeAction", () => {
  it("summarises grants, edits and plain actions", () => {
    expect(describeAction(action({ action: "suspend" }))).toBe("Suspended profile");
    expect(
      describeAction(action({ action: "edit_profile", data: { fields: ["first_name", "user.email"] } })),
    ).toBe("Edited profile: first_name, user.email");
    expect(
      describeAction(action({ action: "grant_plan", data: { plan: "gold", amount: 1950, method: "upi" } })),
    ).toBe("Granted plan gold (₹1,950 via upi)");
    expect(
      describeAction(action({ action: "grant_plan", data: { plan: "silver", amount: 0, method: "comp" } })),
    ).toBe("Granted plan silver (complimentary)");
  });
});

describe("<ActivityLog>", () => {
  it("loads the trail for one member", async () => {
    apiFetch.mockResolvedValue({ count: 1, next: null, previous: null, results: [action({})] });
    render(<ActivityLog profileId={7} />);
    expect(await screen.findByText("Verified profile")).toBeInTheDocument();
    expect(screen.getByText(/desk@brahmamudi.com/)).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith("/moderation/audit/?profile=7");
  });

  it("shows an empty state", async () => {
    apiFetch.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    render(<ActivityLog />);
    expect(await screen.findByText("No staff actions yet.")).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith("/moderation/audit/");
  });
});
