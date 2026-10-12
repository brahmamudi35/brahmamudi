import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlans } from "@/lib/server-api";
import { SITE } from "@/lib/site-info";
import type { MembershipPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Plans & pricing",
  description: "Membership plans and prices for brahmamudi Vishwabrahmin matrimony.",
};

const inr = (v: string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(v),
  );

function validity(p: MembershipPlan) {
  if (!p.duration_months) return "No time limit";
  if (p.duration_months % 12 === 0) {
    const y = p.duration_months / 12;
    return `${y} year${y > 1 ? "s" : ""}`;
  }
  return `${p.duration_months} months`;
}

function features(p: MembershipPlan): string[] {
  const paid = Number(p.price_inr) > 0;
  return [
    "Create your profile with photos and horoscope",
    "Search and browse all profiles",
    p.interests_per_day == null
      ? "Unlimited interests per day"
      : `Send up to ${p.interests_per_day} interests per day`,
    !paid
      ? "Contact details hidden"
      : p.contact_views == null
        ? "Unlimited contact views"
        : `View contact details of ${p.contact_views} profiles`,
    ...(paid ? ["View horoscope documents of unlocked profiles", "Personal assistance by phone / WhatsApp"] : []),
  ];
}

export default async function PricingPage() {
  const plans = await getPlans();

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">Plans &amp; pricing</h1>
        <p className="mt-3 text-muted-foreground">
          Registration is free. Upgrade when you&apos;re ready to view contact
          details and connect with families. No commission, no hidden charges.
        </p>
      </div>

      {plans && plans.length > 0 ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => {
            const highlight = p.slug === "gold";
            return (
              <Card key={p.id} className={cn("flex flex-col", highlight && "border-primary shadow-md")}>
                <CardHeader>
                  {highlight && (
                    <span className="w-fit rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Most popular
                    </span>
                  )}
                  <CardTitle className="font-heading text-xl">{p.name}</CardTitle>
                  <p className="text-3xl font-semibold">
                    {Number(p.price_inr) > 0 ? inr(p.price_inr) : "Free"}
                  </p>
                  <p className="text-sm text-muted-foreground">Validity: {validity(p)}</p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className="flex-1 space-y-2 text-sm">
                    {features(p).map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-6 w-full"
                    variant={highlight ? "default" : "outline"}
                    render={<Link href={Number(p.price_inr) > 0 ? "/membership" : "/register"} />}
                  >
                    {Number(p.price_inr) > 0 ? `Choose ${p.name}` : "Register free"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="mt-10 text-center text-muted-foreground">
          Plans couldn&apos;t be loaded right now. Please try again shortly or{" "}
          <Link href="/contact" className="text-primary hover:underline">contact us</Link>.
        </p>
      )}

      <div className="mx-auto mt-12 max-w-2xl space-y-2 text-center text-sm text-muted-foreground">
        <p>
          All prices are in Indian Rupees (INR). Payments are
          processed securely by PayU (cards, UPI, net banking, wallets). A membership is a
          one-time payment for the validity shown — it does not renew automatically.
        </p>
        <p>
          Membership starts as soon as payment succeeds. See our{" "}
          <Link href="/refund-policy" className="text-primary hover:underline">refund &amp; cancellation policy</Link>{" "}
          and <Link href="/terms" className="text-primary hover:underline">terms of service</Link>.
          Questions? Call {SITE.phone} or <Link href="/contact" className="text-primary hover:underline">contact us</Link>.
        </p>
      </div>
    </Container>
  );
}
