"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Container } from "@/components/site/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import type { MembershipPlan, MySubscription, PayUCheckout } from "@/lib/types";
import { cn } from "@/lib/utils";

function planPerks(p: MembershipPlan): string[] {
  return [
    p.contact_views == null
      ? "Unlimited contact views"
      : p.contact_views === 0
        ? "No contact views"
        : `${p.contact_views} contact views`,
    p.interests_per_day == null
      ? "Unlimited interests"
      : `${p.interests_per_day} interests / day`,
    p.can_view_photos ? "See all photos" : "Limited photos",
    ...(p.can_chat ? ["Direct chat"] : []),
    p.duration_months ? `Valid ${p.duration_months} months` : "Free forever",
  ];
}

export default function MembershipPage() {
  const [plans, setPlans] = useState<MembershipPlan[] | null>(null);
  const [mine, setMine] = useState<MySubscription | null>(null);
  const [busyPlan, setBusyPlan] = useState<number | null>(null);

  useEffect(() => {
    apiFetch<MembershipPlan[]>("/membership-plans/", { auth: false })
      .then(setPlans)
      .catch(() => setPlans([]));
    apiFetch<MySubscription>("/membership-plans/my_subscription/")
      .then(setMine)
      .catch(() => setMine({ subscription: null, contact_quota: { plan: "free", limit: 0, used: 0, remaining: 0, unlimited: false } }));
  }, []);

  async function upgrade(plan: MembershipPlan) {
    setBusyPlan(plan.id);
    try {
      const { form } = await apiFetch<PayUCheckout>("/payments/payu/initiate/", {
        method: "POST",
        body: { plan: plan.id },
      });
      // Auto-submit a hidden form to PayU.
      const el = document.createElement("form");
      el.method = "POST";
      el.action = form.action;
      for (const [k, v] of Object.entries(form)) {
        if (k === "action") continue;
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = String(v);
        el.appendChild(input);
      }
      document.body.appendChild(el);
      el.submit();
    } catch (err) {
      const e = err as { status?: number; detail?: string };
      toast.error(
        e.status === 503
          ? "Online payments aren't set up yet. Please contact the office."
          : (e.detail ?? "Couldn't start checkout."),
      );
      setBusyPlan(null);
    }
  }

  const currentSlug = mine?.subscription?.plan.slug ?? "free";

  return (
    <Container className="max-w-5xl py-8">
      <h1 className="font-heading text-3xl font-semibold">Membership</h1>
      <p className="mt-1 text-muted-foreground">
        Upgrade to view contact details and connect with more families.
      </p>

      {mine && (
        <Card className="mt-6 border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
            <span>
              Current plan:{" "}
              <strong className="capitalize">
                {mine.subscription?.plan.name ?? "Free"}
              </strong>
              {mine.subscription?.expires_on &&
                ` · expires ${new Date(mine.subscription.expires_on).toLocaleDateString("en-IN")}`}
            </span>
            <span className="text-muted-foreground">
              Contact views:{" "}
              {mine.contact_quota.unlimited
                ? "unlimited"
                : `${mine.contact_quota.remaining ?? 0} left`}
            </span>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {plans === null
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-96 w-full" />
            ))
          : plans.map((p) => {
              const isCurrent = p.slug === currentSlug;
              const isPopular = p.slug === "gold";
              return (
                <Card
                  key={p.id}
                  className={cn(
                    "flex flex-col",
                    isPopular && "border-primary shadow-sm",
                  )}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-heading text-xl capitalize">
                        {p.name}
                      </CardTitle>
                      {isPopular && (
                        <Badge>
                          <Sparkles className="size-3" />
                          Popular
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-2xl font-semibold">
                      {Number(p.price_inr) === 0
                        ? "Free"
                        : `₹${Number(p.price_inr).toLocaleString("en-IN")}`}
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <ul className="flex-1 space-y-2 text-sm">
                      {planPerks(p).map((perk) => (
                        <li key={perk} className="flex gap-2">
                          <Check className="size-4 shrink-0 text-primary" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-6 w-full"
                      variant={isPopular ? "default" : "outline"}
                      disabled={isCurrent || Number(p.price_inr) === 0 || busyPlan !== null}
                      onClick={() => upgrade(p)}
                    >
                      {busyPlan === p.id && <Spinner />}
                      {isCurrent
                        ? "Current plan"
                        : Number(p.price_inr) === 0
                          ? "Free plan"
                          : "Upgrade"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Payments are processed securely by PayU. Your membership activates as soon
        as payment is confirmed.
      </p>
    </Container>
  );
}
