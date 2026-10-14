"use client";

import { useEffect, useState } from "react";
import { Check, Copy, MessageCircle, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PAYMENT, waHref } from "@/lib/site-info";
import type { MembershipPlan } from "@/lib/types";

const inr = (v: string | number) => `₹${Number(v).toLocaleString("en-IN")}`;

/** upi://pay link with the amount pre-filled (only when a UPI ID is configured). */
export function upiLink(plan: MembershipPlan, regno: string) {
  if (!PAYMENT.upiId) return null;
  // Built by hand: UPI apps expect a literal "@" in pa and %20 (not "+") for
  // spaces, which URLSearchParams would not produce.
  const params: [string, string][] = [
    ["pa", PAYMENT.upiId],
    ["pn", encodeURIComponent(PAYMENT.upiName)],
    ["am", Number(plan.price_inr).toFixed(2)],
    ["cu", "INR"],
    ["tn", encodeURIComponent(`brahmamudi ${plan.name} ${regno}`.trim())],
  ];
  return `upi://pay?${params.map(([k, v]) => `${k}=${v}`).join("&")}`;
}

/** The WhatsApp message the member sends along with the screenshot. */
export function whatsappMessage(plan: MembershipPlan, regno: string, email: string) {
  return [
    `Hello brahmamudi, I have paid ${inr(plan.price_inr)} for the ${plan.name} membership.`,
    `Profile number: ${regno || "-"}`,
    `Registered email: ${email}`,
    "Payment screenshot attached.",
  ].join("\n");
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium break-all">{value}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Copy ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value.replace(/\s/g, ""));
            setCopied(true);
            toast.success(`${label} copied`);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* clipboard blocked — the value is visible anyway */
          }
        }}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}

function UpiQr({ link }: { link: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    import("qrcode")
      .then((QR) => QR.toDataURL(link, { margin: 1, width: 220 }))
      .then((url) => active && setSrc(url))
      .catch(() => active && setSrc(null));
    return () => {
      active = false;
    };
  }, [link]);
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="UPI QR code" className="mx-auto size-44 rounded-md border bg-white p-1" />;
}

/** How to pay for a plan while online checkout is unavailable: UPI / bank
 *  transfer, then WhatsApp the screenshot; staff activate the plan. */
export function ManualPaymentDialog({
  plan,
  regno,
  email,
  onOpenChange,
}: {
  plan: MembershipPlan | null;
  regno: string;
  email: string;
  onOpenChange: (open: boolean) => void;
}) {
  if (!plan) return null;
  const amount = inr(plan.price_inr);
  const upi = upiLink(plan, regno);
  const wa = `${waHref(PAYMENT.whatsapp)}?text=${encodeURIComponent(whatsappMessage(plan, regno, email))}`;

  return (
    <Dialog open={!!plan} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            Pay {amount} for {plan.name}
          </DialogTitle>
          <DialogDescription>
            Pay by UPI or bank transfer, then send the payment screenshot on
            WhatsApp. We activate your membership {PAYMENT.activationTime}.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-4 text-sm">
          <li>
            <p className="font-medium">1. Pay {amount}</p>
            <div className="mt-2 rounded-lg border p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Smartphone className="size-3.5" /> GPay / PhonePe / any UPI app
              </p>
              {upi && (
                <div className="mt-2 space-y-2">
                  <UpiQr link={upi} />
                  <Button className="w-full sm:hidden" render={<a href={upi} />}>
                    Pay {amount} with a UPI app
                  </Button>
                  <CopyRow label="UPI ID" value={PAYMENT.upiId} />
                  <p className="text-xs text-muted-foreground">Name: {PAYMENT.upiName}</p>
                </div>
              )}
              <CopyRow label="GPay / PhonePe number" value={PAYMENT.upiPhone} />
              <p className="text-xs text-muted-foreground">Name: {PAYMENT.payeeName}</p>
            </div>
            <div className="mt-2 rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground">Or bank transfer (NEFT / IMPS)</p>
              <CopyRow label="Account name" value={PAYMENT.bank.accountName} />
              <CopyRow label="Account number" value={PAYMENT.bank.accountNumber} />
              <CopyRow label="IFSC" value={PAYMENT.bank.ifsc} />
              <p className="text-xs text-muted-foreground">
                {PAYMENT.bank.bankName}, {PAYMENT.bank.branch} branch
              </p>
            </div>
          </li>
          <li>
            <p className="font-medium">2. Send the screenshot on WhatsApp</p>
            <p className="mt-1 text-muted-foreground">
              The message already includes your profile number
              {regno ? ` (${regno})` : ""} and the plan — just attach the screenshot.
            </p>
            <Button
              className="mt-2 w-full bg-[#25D366] text-white hover:bg-[#1ebe5a]"
              render={<a href={wa} target="_blank" rel="noopener noreferrer" />}
            >
              <MessageCircle className="size-4" />
              WhatsApp {PAYMENT.whatsapp}
            </Button>
          </li>
          <li>
            <p className="font-medium">3. We activate your plan</p>
            <p className="mt-1 text-muted-foreground">
              You&apos;ll get an email and a notification as soon as your{" "}
              {plan.name} membership is active. Please keep your screenshot until then.
            </p>
          </li>
        </ol>
      </DialogContent>
    </Dialog>
  );
}
