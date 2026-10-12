import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { MembershipPlan, ModerationSubscription } from "@/lib/types";

import { PlanManager } from "./plan-manager";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch }));
vi.mock("@/lib/form", () => ({ handleApiError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const plan = (slug: string, price: string): MembershipPlan => ({
  id: slug.length,
  name: slug[0].toUpperCase() + slug.slice(1),
  slug,
  description: "",
  duration_months: 12,
  price_inr: price,
  contact_views: 50,
  interests_per_day: 50,
  can_view_photos: true,
});
const PLANS = [plan("free", "0.00"), plan("silver", "1450.00"), plan("gold", "1950.00")];

const sub: ModerationSubscription = {
  id: 9,
  plan: "Silver",
  plan_slug: "silver",
  status: "active",
  started_on: "2026-10-12",
  expires_on: "2027-04-10",
  is_current: true,
  is_legacy: false,
  payment_id: null,
  created_at: "2026-10-12T00:00:00Z",
} as ModerationSubscription;

function setup(subs: ModerationSubscription[] = []) {
  const onChange = vi.fn();
  render(<PlanManager profileId={7} subscriptions={subs} plans={PLANS} onChange={onChange} />);
  return onChange;
}

async function confirmDialog(label: string) {
  const dialog = await screen.findByRole("alertdialog");
  await userEvent.click(within(dialog).getByRole("button", { name: label }));
  return dialog;
}

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue({});
});

describe("<PlanManager>", () => {
  it("hides the free plan from the grant list", () => {
    setup();
    const options = within(screen.getByLabelText("Plan")).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "Choose plan…",
      "Silver (₹1,450)",
      "Gold (₹1,950)",
    ]);
  });

  it("records an offline payment with amount, method and reference", async () => {
    const onChange = setup();
    await userEvent.selectOptions(screen.getByLabelText("Plan"), "gold");
    // amount pre-fills from the plan price
    expect(screen.getByLabelText("Amount received")).toHaveValue("1950");
    await userEvent.type(screen.getByLabelText("Reference"), "UPI-42");
    await userEvent.click(screen.getByRole("button", { name: "Grant plan" }));
    expect(await screen.findByText(/₹1,950 received by UPI/)).toBeInTheDocument();
    await confirmDialog("Grant plan");

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const [url, opts] = apiFetch.mock.calls[0];
    expect(url).toBe("/moderation/profiles/7/grant-plan/");
    expect(opts.body).toMatchObject({ plan: "gold", method: "upi", amount: 1950, reference: "UPI-42" });
  });

  it("sends a complimentary grant at zero and warns it replaces the current plan", async () => {
    setup([sub]);
    await userEvent.selectOptions(screen.getByLabelText("Plan"), "gold");
    await userEvent.selectOptions(screen.getByLabelText("Payment method"), "comp");
    expect(screen.queryByLabelText("Amount received")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Grant plan" }));
    expect(await screen.findByText(/replaces the member's current Silver/)).toBeInTheDocument();
    await confirmDialog("Grant plan");
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(apiFetch.mock.calls[0][1].body).toMatchObject({ method: "comp", amount: 0 });
  });

  it("asks before revoking", async () => {
    setup([sub]);
    await userEvent.click(screen.getByRole("button", { name: "Revoke" }));
    expect(apiFetch).not.toHaveBeenCalled();
    await confirmDialog("Revoke");
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith("/moderation/subscriptions/9/revoke/", { method: "POST" }),
    );
  });
});
