import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { ModerationPayment, Paginated } from "@/lib/types";

import { PaymentsTable } from "./payments-table";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch }));
vi.mock("@/lib/form", () => ({ handleApiError: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

function payment(o: Partial<ModerationPayment> = {}): ModerationPayment {
  return {
    id: 1,
    txnid: "abcdef0123456789",
    mihpayid: "",
    profile_id: 7,
    regno: "BM000007",
    profile_name: "Ravi Kumar",
    plan: "Gold",
    amount: "2500.00",
    status: "success",
    environment: "production",
    mode: "CC",
    email: "ravi@example.com",
    phone: "",
    error_message: "",
    is_legacy: false,
    created_at: "2026-02-01T00:00:00Z",
    completed_at: null,
    ...o,
  };
}

const page = (results: ModerationPayment[]): Paginated<ModerationPayment> => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue(page([payment()]));
});

describe("<PaymentsTable>", () => {
  it("renders payment rows from the API", async () => {
    render(<PaymentsTable />);
    expect(await screen.findByText("Ravi Kumar")).toBeInTheDocument();
    expect(screen.getByText("₹2,500")).toBeInTheDocument();
    expect(screen.getByText("success")).toBeInTheDocument();

    const url = apiFetch.mock.calls[0][0] as string;
    expect(url).toContain("/moderation/payments/");
    expect(url).toContain("limit=25");
  });

  it("adds ?status= when the filter changes", async () => {
    const user = userEvent.setup();
    render(<PaymentsTable />);
    await screen.findByText("Ravi Kumar");

    await user.selectOptions(screen.getByRole("combobox"), "failure");

    await waitFor(() => {
      const last = apiFetch.mock.calls.at(-1)![0] as string;
      expect(last).toContain("status=failure");
    });
  });

  it("scopes to one member and hides the filter bar when given profileId", async () => {
    render(<PaymentsTable profileId={7} />);
    // the name column is dropped in member-scoped mode; the amount still shows
    await screen.findByText("₹2,500");

    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByPlaceholderText(/txn id/i)).toBeNull();
    expect(screen.queryByText("Ravi Kumar")).toBeNull();
    expect(apiFetch.mock.calls[0][0] as string).toContain("profile=7");
  });

  it("shows an empty state when there are no payments", async () => {
    apiFetch.mockResolvedValue(page([]));
    render(<PaymentsTable />);
    expect(await screen.findByText(/no payments found/i)).toBeInTheDocument();
  });
});
