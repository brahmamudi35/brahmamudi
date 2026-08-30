import Link from "next/link";
import {
  HeartHandshake,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { Container } from "@/components/site/container";
import { Mark } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getStats } from "@/lib/server-api";

export default async function LandingPage() {
  const stats = await getStats();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-accent/40 to-background">
        <Container className="grid gap-10 py-16 md:grid-cols-2 md:py-24">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              Exclusively for the Vishwabrahmin community
            </span>
            <h1 className="mt-4 font-heading text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
              Where Vishwakarma families find the right match.
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted-foreground">
              Verified profiles with full horoscope details, sub-caste, and
              family background — the way our community has always looked for
              alliances, now online.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" render={<Link href="/register" />}>
                Register free
              </Button>
              <Button
                size="lg"
                variant="outline"
                render={<Link href="/login" />}
              >
                I&apos;m already a member
              </Button>
            </div>
            {stats && (
              <p className="mt-6 text-sm text-muted-foreground">
                <strong className="text-foreground">
                  {stats.active_profiles.toLocaleString("en-IN")}
                </strong>{" "}
                active profiles · {stats.brides.toLocaleString("en-IN")} brides ·{" "}
                {stats.grooms.toLocaleString("en-IN")} grooms
              </p>
            )}
          </div>

          <div className="flex items-center justify-center">
            <div className="relative aspect-square w-full max-w-sm rounded-3xl border bg-card p-8 shadow-sm">
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <Mark className="size-20 text-primary" />
                <p className="font-heading text-2xl font-semibold">
                  The marriage knot,
                  <br /> tied with trust.
                </p>
                <p className="text-sm text-muted-foreground">
                  Goldsmith · Carpenter · Blacksmith · Kanchari · Shilpi
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section className="py-16">
        <Container>
          <h2 className="text-center font-heading text-3xl font-semibold">
            Three steps to your alliance
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                n: "1",
                title: "Create your profile",
                body: "Add bio-data, horoscope (nakshatram, raasi, paadam), education, career and family details.",
              },
              {
                n: "2",
                title: "Search with real filters",
                body: "Filter by sub-caste, star, gothram, age, height, location and more — not vague guesses.",
              },
              {
                n: "3",
                title: "Connect with families",
                body: "Express interest, shortlist, and exchange contact details once both sides agree.",
              },
            ].map((s) => (
              <Card key={s.n}>
                <CardContent className="pt-6">
                  <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 font-heading text-lg font-semibold text-primary">
                    {s.n}
                  </div>
                  <h3 className="mt-4 font-medium">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Trust */}
      <section className="border-y bg-muted/30 py-16">
        <Container>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: ShieldCheck,
                title: "Verified profiles",
                body: "Profiles are reviewed by our team and carry a verified badge.",
              },
              {
                icon: ScrollText,
                title: "Horoscope details",
                body: "Nakshatram, raasi and paadam on every profile for jataka matching.",
              },
              {
                icon: Users,
                title: "Community only",
                body: "Strictly Vishwabrahmin — all five sub-castes, one platform.",
              },
              {
                icon: HeartHandshake,
                title: "Family-first",
                body: "Parents can register and manage a profile for their son or daughter.",
              },
            ].map((f) => (
              <div key={f.title}>
                <f.icon className="size-6 text-primary" />
                <h3 className="mt-3 font-medium">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-20">
        <Container className="text-center">
          <h2 className="font-heading text-3xl font-semibold">
            Your family&apos;s next chapter starts here
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Registration is free. Upgrade only when you&apos;re ready to view
            contact details and connect.
          </p>
          <Button size="lg" className="mt-8" render={<Link href="/register" />}>
            Create your free profile
          </Button>
        </Container>
      </section>
    </>
  );
}
