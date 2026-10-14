import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { Container } from "@/components/site/container";
import { Card, CardContent } from "@/components/ui/card";
import { SITE, telHref, waHref } from "@/lib/site-info";

export const metadata: Metadata = {
  title: "Contact us",
  description: `Reach ${SITE.operator} — phone, WhatsApp, email and office address.`,
};

const ROWS = [
  { icon: Phone, label: "Phone", value: SITE.phone, href: telHref(SITE.phone) },
  { icon: MessageCircle, label: "WhatsApp", value: SITE.whatsapp, href: waHref(SITE.whatsapp) },
  { icon: Mail, label: "Email", value: SITE.email, href: `mailto:${SITE.email}` },
  { icon: Clock, label: "Support hours", value: SITE.hours },
];

export default function ContactPage() {
  return (
    <Container className="max-w-3xl py-12 sm:py-16">
      <h1 className="font-heading text-3xl font-semibold sm:text-4xl">Contact us</h1>
      <p className="mt-3 text-muted-foreground">
        For help with registration, your profile, payments or memberships, reach
        us by phone, WhatsApp or email. We usually reply within one working day.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {ROWS.map((r) => (
          <Card key={r.label}>
            <CardContent className="flex items-start gap-3 py-5">
              <r.icon className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">{r.label}</p>
                {r.href ? (
                  <a
                    href={r.href}
                    className="font-medium break-all hover:text-primary"
                    {...(r.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {r.value}
                  </a>
                ) : (
                  <p className="font-medium">{r.value}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardContent className="flex items-start gap-3 py-5">
          <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Office address</p>
            <p className="font-medium">{SITE.operator}</p>
            {SITE.address.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="mt-8 text-sm text-muted-foreground">
        For payment issues, please include your profile number (e.g. BM001234)
        and the UPI / bank transaction reference (UTR) from your payment so we can help faster.
        Complaints and grievances are handled as described in our{" "}
        <a href="/privacy#grievance" className="text-primary hover:underline">
          privacy policy
        </a>
        .
      </p>
    </Container>
  );
}
