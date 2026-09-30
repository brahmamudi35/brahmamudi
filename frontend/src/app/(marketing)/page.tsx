import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Gem,
  Hammer,
  HeartHandshake,
  ScrollText,
  Shapes,
  ShieldCheck,
  Sparkle,
  Sparkles,
  Users,
} from "lucide-react";

import { Container } from "@/components/site/container";
import { Mark } from "@/components/site/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getStats } from "@/lib/server-api";

const SUBCASTES = [
  {
    name: "Goldsmith",
    telugu: "Ausula / Swarnakara",
    icon: Gem,
    iconClass: "bg-chart-1/10 text-chart-1",
    barClass: "bg-chart-1",
  },
  {
    name: "Carpenter",
    telugu: "Vadla / Vardhaki",
    icon: Hammer,
    iconClass: "bg-chart-2/15 text-chart-2",
    barClass: "bg-chart-2",
  },
  {
    name: "Blacksmith",
    telugu: "Kammari / Karmara",
    icon: Flame,
    iconClass: "bg-chart-3/10 text-chart-3",
    barClass: "bg-chart-3",
  },
  {
    name: "Kanchari",
    telugu: "Kansara",
    icon: Sparkle,
    iconClass: "bg-chart-4/10 text-chart-4",
    barClass: "bg-chart-4",
  },
  {
    name: "Shilpi",
    telugu: "Sthapati",
    icon: Shapes,
    iconClass: "bg-chart-5/10 text-chart-5",
    barClass: "bg-chart-5",
  },
];

/** Illustrative only — not real member data. */
const PREVIEW_PROFILES = [
  { initials: "AR", label: "A. R.", age: 29, city: "Hyderabad", role: "Software Engineer" },
  { initials: "SP", label: "S. P.", age: 26, city: "Bengaluru", role: "Chartered Accountant" },
  { initials: "VK", label: "V. K.", age: 31, city: "Vijayawada", role: "Doctor" },
];

export default async function LandingPage() {
  const stats = await getStats();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,var(--accent),transparent)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:22px_22px] text-primary/15"
        />

        <Container className="relative grid gap-12 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="size-3.5 text-primary" />
              Exclusively for the Vishwabrahmin community
            </span>
            <h1 className="mt-5 font-heading text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
              Where Vishwakarma families find the right match.
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Verified profiles with full horoscope details, sub-caste, and
              family background — the way our community has always looked for
              alliances, now online.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" render={<Link href="/register" />}>
                Register free
                <ArrowRight className="size-4" />
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
              <dl className="mt-10 grid max-w-sm grid-cols-3 gap-4 border-t pt-6">
                <div>
                  <dt className="text-xs text-muted-foreground">Active profiles</dt>
                  <dd className="mt-0.5 font-heading text-2xl font-semibold text-foreground">
                    {stats.active_profiles.toLocaleString("en-IN")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Brides</dt>
                  <dd className="mt-0.5 font-heading text-2xl font-semibold text-foreground">
                    {stats.brides.toLocaleString("en-IN")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Grooms</dt>
                  <dd className="mt-0.5 font-heading text-2xl font-semibold text-foreground">
                    {stats.grooms.toLocaleString("en-IN")}
                  </dd>
                </div>
              </dl>
            )}
          </div>

          <div className="relative flex items-center justify-center">
            <div
              aria-hidden
              className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-primary/15 via-accent/40 to-transparent blur-2xl"
            />
            <div className="relative w-full max-w-md">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-lg ring-1 ring-foreground/10">
                <Image
                  src="/images/hero-wedding-hands.jpg"
                  alt="Bride and groom holding hands at their wedding, with mehndi and bangles"
                  fill
                  priority
                  sizes="(min-width: 768px) 28rem, 100vw"
                  className="object-cover"
                />
              </div>

              {/* Illustrative preview card — not real member data */}
              <Card className="absolute -bottom-6 -left-6 w-56 shadow-lg">
                <CardContent className="flex items-center gap-3 py-1">
                  <Avatar size="lg">
                    <AvatarFallback className="bg-accent font-heading text-accent-foreground">
                      {PREVIEW_PROFILES[0].initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium">
                        {PREVIEW_PROFILES[0].label}, {PREVIEW_PROFILES[0].age}
                      </p>
                      <ShieldCheck className="size-3.5 shrink-0 text-primary" />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {PREVIEW_PROFILES[0].role}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {stats && (
                <Badge className="absolute -top-4 -right-4 h-auto rounded-full px-3 py-1.5 text-xs shadow-lg">
                  {stats.active_profiles.toLocaleString("en-IN")}+ verified
                  profiles
                </Badge>
              )}
            </div>
          </div>
        </Container>
        <p className="relative pb-6 text-center text-xs text-muted-foreground">
          Preview card is illustrative — not a real member profile
        </p>
      </section>

      {/* Sub-castes */}
      <section className="py-14">
        <Container>
          <div className="flex flex-col items-center gap-3 text-center">
            <Mark className="size-8 text-primary" />
            <h2 className="font-heading text-2xl font-semibold">
              One platform, all five Vishwabrahmin sub-castes
            </h2>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {SUBCASTES.map((s) => (
              <div
                key={s.name}
                className="overflow-hidden rounded-2xl border bg-card text-center shadow-sm transition-transform hover:-translate-y-0.5"
              >
                <div className={`h-1 ${s.barClass}`} />
                <div className="flex flex-col items-center gap-2 px-6 py-5">
                  <div
                    className={`flex size-10 items-center justify-center rounded-full ${s.iconClass}`}
                  >
                    <s.icon className="size-5" />
                  </div>
                  <p className="font-heading font-medium text-foreground">
                    {s.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.telugu}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section className="border-y bg-muted/30 py-16">
        <Container>
          <h2 className="text-center font-heading text-3xl font-semibold">
            Three steps to your alliance
          </h2>
          <div className="relative mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
            <div
              aria-hidden
              className="absolute top-5 left-0 hidden h-px w-full bg-border md:block"
            />
            {[
              {
                n: "1",
                title: "Create your profile",
                body: "Add bio-data, horoscope (nakshatram, raasi, paadam), education, career and family details.",
                circleClass: "border-chart-1 text-chart-1",
              },
              {
                n: "2",
                title: "Search with real filters",
                body: "Filter by sub-caste, star, gothram, age, height, location and more — not vague guesses.",
                circleClass: "border-chart-2 text-chart-2",
              },
              {
                n: "3",
                title: "Connect with families",
                body: "Express interest, shortlist, and exchange contact details once both sides agree.",
                circleClass: "border-chart-3 text-chart-3",
              },
            ].map((s) => (
              <div key={s.n} className="relative">
                <div
                  className={`relative z-10 flex size-10 items-center justify-center rounded-full border-2 bg-background font-heading text-lg font-semibold ${s.circleClass}`}
                >
                  {s.n}
                </div>
                <h3 className="mt-4 font-medium">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Trust */}
      <section className="py-16">
        <Container>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: ShieldCheck,
                title: "Verified profiles",
                body: "Profiles are reviewed by our team and carry a verified badge.",
                iconClass: "bg-chart-1/10 text-chart-1",
              },
              {
                icon: ScrollText,
                title: "Horoscope details",
                body: "Nakshatram, raasi and paadam on every profile for jataka matching.",
                iconClass: "bg-chart-4/10 text-chart-4",
              },
              {
                icon: Users,
                title: "Community only",
                body: "Strictly Vishwabrahmin — all five sub-castes, one platform.",
                iconClass: "bg-chart-3/10 text-chart-3",
              },
              {
                icon: HeartHandshake,
                title: "Family-first",
                body: "Parents can register and manage a profile for their son or daughter.",
                iconClass: "bg-chart-5/10 text-chart-5",
              },
            ].map((f) => (
              <div key={f.title}>
                <div
                  className={`flex size-10 items-center justify-center rounded-full ${f.iconClass}`}
                >
                  <f.icon className="size-5" />
                </div>
                <h3 className="mt-3 font-medium">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Brand story */}
      <section className="border-t bg-gradient-to-br from-accent/40 via-muted/30 to-background py-16">
        <Container className="grid gap-8 md:grid-cols-[auto_1fr] md:items-start">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Mark className="size-6 text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-semibold">
              Why &ldquo;brahmamudi&rdquo;
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              A <em>mudi</em> is a knot — the marriage knot our families tie
              with trust, not chance. Brahmamudi brings that same care online:
              full bio-data, real horoscope matching, and profiles reviewed by
              people who understand what a Vishwabrahmin family is actually
              looking for.
            </p>
            <Link
              href="/about"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Read our story
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-16">
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-chart-5 px-6 py-16 text-center shadow-lg">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:20px_20px] text-primary-foreground"
            />
            <div className="relative">
              <h2 className="font-heading text-3xl font-semibold text-primary-foreground">
                Your family&apos;s next chapter starts here
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-primary-foreground/85">
                Registration is free. Upgrade only when you&apos;re ready to
                view contact details and connect.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button
                  size="lg"
                  variant="secondary"
                  render={<Link href="/register" />}
                >
                  Create your free profile
                  <ArrowRight className="size-4" />
                </Button>
                <div className="flex items-center gap-1.5 text-sm text-primary-foreground/85">
                  <CheckCircle2 className="size-4" />
                  No credit card required
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
