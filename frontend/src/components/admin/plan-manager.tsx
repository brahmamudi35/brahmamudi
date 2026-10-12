"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmButton } from "@/components/admin/confirm-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { handleApiError } from "@/lib/form";
import type { MembershipPlan, ModerationSubscription } from "@/lib/types";

export const PAYMENT_METHODS = [
  { value: "upi", label: "UPI / GPay / PhonePe" },
  { value: "bank", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "comp", label: "Complimentary (no payment)" },
] as const;

const inr = (v: string | number) => `₹${Number(v).toLocaleString("en-IN")}`;

/** Staff: see a member's subscriptions, revoke the current one, or grant a
 *  plan — recording how it was paid for (offline payment or complimentary). */
export function PlanManager({
  profileId,
  subscriptions,
  plans,
  onChange,
}: {
  profileId: number;
  subscriptions: ModerationSubscription[];
  plans: MembershipPlan[];
  onChange: () => void;
}) {
  const [slug, setSlug] = useState("");
  const [months, setMonths] = useState("");
  const [method, setMethod] = useState("upi");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const plan = plans.find((pl) => pl.slug === slug);
  const comp = method === "comp";
  const current = subscriptions.find((s) => s.is_current);
  const ready = !!slug && (comp || Number(amount) > 0);

  function choosePlan(next: string) {
    setSlug(next);
    const pl = plans.find((x) => x.slug === next);
    if (pl && !comp) setAmount(String(Number(pl.price_inr)));
  }

  async function grant() {
    try {
      await apiFetch(`/moderation/profiles/${profileId}/grant-plan/`, {
        method: "POST",
        body: {
          plan: slug,
          months: months ? Number(months) : undefined,
          method,
          amount: comp ? 0 : Number(amount),
          reference,
          note,
        },
      });
      toast.success("Plan granted.");
      setSlug("");
      setMonths("");
      setAmount("");
      setReference("");
      setNote("");
      onChange();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function revoke(id: number) {
    try {
      await apiFetch(`/moderation/subscriptions/${id}/revoke/`, { method: "POST" });
      toast.success("Subscription revoked.");
      onChange();
    } catch (err) {
      handleApiError(err);
    }
  }

  const fieldCls =
    "h-8 rounded-md border bg-background px-2 text-sm outline-none focus-visible:border-ring";

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <h2 className="font-heading text-lg font-semibold">Membership</h2>

        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subscriptions on record.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {subscriptions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5"
              >
                <span>
                  <span className="font-medium">{s.plan}</span>{" "}
                  <Badge variant={s.is_current ? "default" : "outline"} className="ml-1 align-middle">
                    {s.status}
                  </Badge>
                  <span className="block text-xs text-muted-foreground">
                    {s.started_on || "—"} → {s.expires_on || "no expiry"}
                    {s.is_legacy ? " · legacy" : ""}
                  </span>
                </span>
                {s.is_current && (
                  <ConfirmButton
                    size="sm"
                    variant="outline"
                    title={`Revoke ${s.plan}?`}
                    description="The member loses paid features (contact views, higher limits) immediately. This does not refund any payment."
                    confirmLabel="Revoke"
                    onConfirm={() => revoke(s.id)}
                  >
                    Revoke
                  </ConfirmButton>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 rounded-lg border bg-muted/20 p-2">
          <p className="text-xs font-medium text-muted-foreground">Grant a plan</p>
          <div className="flex gap-2">
            <select
              aria-label="Plan"
              value={slug}
              onChange={(e) => choosePlan(e.target.value)}
              className={`${fieldCls} flex-1`}
            >
              <option value="">Choose plan…</option>
              {plans
                .filter((pl) => Number(pl.price_inr) > 0)
                .map((pl) => (
                  <option key={pl.slug} value={pl.slug}>
                    {pl.name} ({inr(pl.price_inr)})
                  </option>
                ))}
            </select>
            <input
              aria-label="Months"
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              inputMode="numeric"
              placeholder="Months"
              className={`${fieldCls} w-20`}
            />
          </div>
          <select
            aria-label="Payment method"
            value={method}
            onChange={(e) => {
              setMethod(e.target.value);
              if (e.target.value === "comp") setAmount("");
              else if (plan && !amount) setAmount(String(Number(plan.price_inr)));
            }}
            className={`${fieldCls} w-full`}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          {!comp && (
            <div className="flex gap-2">
              <input
                aria-label="Amount received"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="Amount ₹"
                className={`${fieldCls} w-28`}
              />
              <input
                aria-label="Reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                maxLength={40}
                placeholder="UPI / bank ref"
                className={`${fieldCls} flex-1`}
              />
            </div>
          )}
          <input
            aria-label="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            placeholder="Note (optional)"
            className={`${fieldCls} w-full`}
          />
          <ConfirmButton
            size="sm"
            className="w-full"
            disabled={!ready}
            destructive={false}
            title={`Grant ${plan?.name ?? "plan"}?`}
            description={
              <>
                {comp
                  ? "Recorded as complimentary (₹0)."
                  : `Recorded as ${inr(amount || 0)} received by ${
                      PAYMENT_METHODS.find((m) => m.value === method)?.label
                    }.`}{" "}
                {current
                  ? `This replaces the member's current ${current.plan} subscription.`
                  : ""}
              </>
            }
            confirmLabel="Grant plan"
            onConfirm={grant}
          >
            Grant plan
          </ConfirmButton>
          <p className="text-[11px] text-muted-foreground">
            Leave months blank to use the plan&apos;s own duration. Every grant is
            added to Payments and the activity log.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
