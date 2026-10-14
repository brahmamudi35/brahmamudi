import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { PAYMENT } from "@/lib/site-info";
import type { MembershipPlan } from "@/lib/types";

import { ManualPaymentDialog, upiLink, whatsappMessage } from "./manual-payment-dialog";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const silver: MembershipPlan = {
  id: 2,
  name: "Silver",
  slug: "silver",
  description: "",
  duration_months: 6,
  price_inr: "1450.00",
  contact_views: 25,
  interests_per_day: 25,
  can_view_photos: true,
};

describe("manual payment", () => {
  it("builds a WhatsApp message with plan, amount, profile number and email", () => {
    const msg = whatsappMessage(silver, "BM001396", "me@example.com");
    expect(msg).toContain("₹1,450 for the Silver membership");
    expect(msg).toContain("Profile number: BM001396");
    expect(msg).toContain("Registered email: me@example.com");
  });

  it("only offers a UPI pay link when a UPI ID is configured", () => {
    const saved = PAYMENT.upiId;
    PAYMENT.upiId = "";
    expect(upiLink(silver, "BM1")).toBeNull();
    PAYMENT.upiId = "8297111166@ybl";
    const link = upiLink(silver, "BM1")!;
    expect(link.startsWith("upi://pay?")).toBe(true);
    const q = new URLSearchParams(link.slice("upi://pay?".length));
    expect(q.get("pa")).toBe("8297111166@ybl");
    expect(q.get("am")).toBe("1450.00");
    expect(q.get("cu")).toBe("INR");
    PAYMENT.upiId = saved;
  });

  it("shows the amount, payment details and a prefilled WhatsApp link", async () => {
    render(
      <ManualPaymentDialog plan={silver} regno="BM001396" email="me@example.com" onOpenChange={() => {}} />,
    );
    expect(await screen.findByText("Pay ₹1,450 for Silver")).toBeInTheDocument();
    expect(screen.getByText(PAYMENT.upiPhone)).toBeInTheDocument();
    expect(screen.getByText(PAYMENT.bank.accountNumber)).toBeInTheDocument();
    expect(screen.getByText(PAYMENT.bank.ifsc)).toBeInTheDocument();

    const wa = screen.getByText(`WhatsApp ${PAYMENT.whatsapp}`).closest("a") as HTMLAnchorElement;
    expect(wa.href).toContain("https://wa.me/918297111166?text=");
    expect(decodeURIComponent(wa.href)).toContain("Profile number: BM001396");
  });

  it("renders nothing without a plan", () => {
    const { container } = render(
      <ManualPaymentDialog plan={null} regno="" email="" onOpenChange={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
