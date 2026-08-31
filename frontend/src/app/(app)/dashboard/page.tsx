"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  ImageIcon,
  MailWarning,
  ShieldCheck,
  Sparkles,
  UserRoundPen,
} from "lucide-react";
import { toast } from "sonner";

import { MatchCard } from "@/components/profiles/match-card";
import { ProfileCardSkeleton } from "@/components/profiles/profile-card";
import { Container } from "@/components/site/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Completeness, Profile, SuggestedProfile } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [completeness, setCompleteness] = useState<Completeness | null>(null);

  useEffect(() => {
    if (!user?.has_profile) {
      setLoading(false);
      return;
    }
    apiFetch<Profile>("/profiles/me/")
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
    apiFetch<Completeness>("/profiles/me/completeness/")
      .then(setCompleteness)
      .catch(() => {});
  }, [user?.has_profile]);

  // A staff account with no member profile is here to administer, not to
  // build a bio-data — show the admin shortcut instead of the member prompts.
  const staffOnly = !!user?.is_staff && !user?.has_profile;

  return (
    <Container className="py-8">
      <h1 className="font-heading text-3xl font-semibold">
        Namaste{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}
      </h1>

      {user && !user.email_verified && !staffOnly && (
        <VerifyEmailBanner email={user.email} />
      )}

      {staffOnly ? (
        <StaffPanel />
      ) : (
        <>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : !user?.has_profile ? (
                <NoProfileCard />
              ) : (
                <ProfileCard profile={profile} />
              )}
            </div>

            <div className="space-y-4">
              {user?.has_profile && completeness && !completeness.complete && (
                <CompletenessCard data={completeness} />
              )}
              <QuickLink
                href="/onboarding"
                icon={UserRoundPen}
                title={user?.has_profile ? "Edit profile" : "Create profile"}
                desc="Bio-data, horoscope, family, preferences"
              />
              <QuickLink
                href="/profile/photos"
                icon={ImageIcon}
                title="Photos"
                desc="Upload and manage your photos"
                disabled={!user?.has_profile}
              />
            </div>
          </div>

          {user?.has_profile && <MatchesStrip />}
        </>
      )}
    </Container>
  );
}

function StaffPanel() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <QuickLink
        href="/admin"
        icon={ShieldCheck}
        title="Admin"
        desc="Guided search, member directory, photo moderation"
      />
      <QuickLink
        href="/search"
        icon={Sparkles}
        title="Browse members"
        desc="The full member search"
      />
      <a
        href={`${API_BASE.replace(/\/api\/v1\/?$/, "")}/admin/`}
        target="_blank"
        rel="noopener noreferrer"
        className="sm:col-span-2"
      >
        <Card className="transition-colors hover:border-primary/40 hover:bg-accent/30">
          <CardContent className="flex items-center gap-3 py-4">
            <ChevronRight className="size-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Django admin</p>
              <p className="text-xs text-muted-foreground">
                Full data access, bulk actions, CSV export (opens the backend)
              </p>
            </div>
          </CardContent>
        </Card>
      </a>
    </div>
  );
}

function CompletenessCard({ data }: { data: Completeness }) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Profile {data.percent}% complete</span>
        </div>
        <Progress value={data.percent} />
        <div className="flex flex-wrap gap-1.5">
          {data.missing.slice(0, 4).map((s) => (
            <Link
              key={s.key}
              href={`/onboarding?step=${s.step}`}
              className="rounded-full border border-primary/30 bg-background px-2 py-0.5 text-xs hover:bg-accent"
            >
              + {s.label}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MatchesStrip() {
  const [rows, setRows] = useState<SuggestedProfile[] | null>(null);

  useEffect(() => {
    apiFetch<SuggestedProfile[]>("/profiles/suggestions/?limit=8")
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  if (rows && rows.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-xl font-semibold">
          <Sparkles className="size-5 text-primary" />
          Matches for you
        </h2>
        <Button variant="ghost" size="sm" render={<Link href="/matches" />}>
          See all
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {!rows
          ? Array.from({ length: 4 }).map((_, i) => <ProfileCardSkeleton key={i} />)
          : rows.map((p) => <MatchCard key={p.id} profile={p} />)}
      </div>
    </section>
  );
}

function VerifyEmailBanner({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  return (
    <Card className="mt-6 border-primary/30 bg-primary/5">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-3">
          <MailWarning className="size-5 text-primary" />
          <p className="text-sm">
            Verify your email <span className="font-medium">{email}</span> to keep
            your account active.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={sent}
          onClick={async () => {
            await apiFetch("/auth/email/verify/resend/", {
              method: "POST",
              auth: false,
              body: { email },
            });
            setSent(true);
            toast.success("Verification email sent.");
          }}
        >
          {sent ? "Sent" : "Resend email"}
        </Button>
      </CardContent>
    </Card>
  );
}

function NoProfileCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">
          Let&apos;s set up your profile
        </CardTitle>
        <CardDescription>
          Add your bio-data and photos so families can find you. It takes about
          five minutes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button render={<Link href="/onboarding" />}>
          Start now
          <ChevronRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

const STATUS: Record<string, { label: string; icon: typeof Clock; cls: string }> = {
  pending: { label: "Pending review", icon: Clock, cls: "text-amber-600" },
  active: { label: "Live", icon: CheckCircle2, cls: "text-emerald-600" },
  expired: { label: "Expired", icon: Clock, cls: "text-muted-foreground" },
  hidden: { label: "Hidden", icon: Clock, cls: "text-muted-foreground" },
  suspended: { label: "Suspended", icon: Clock, cls: "text-destructive" },
};

function ProfileCard({ profile }: { profile: Profile | null }) {
  if (!profile) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Couldn&apos;t load your profile. Try refreshing.
        </CardContent>
      </Card>
    );
  }
  const s = STATUS[profile.status] ?? STATUS.pending;
  const photo = profile.photos?.find((p) => p.is_primary) ?? profile.photos?.[0];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="font-heading text-xl">
            {profile.full_name || "Your profile"}
          </CardTitle>
          <CardDescription>{profile.regno}</CardDescription>
        </div>
        <Badge variant="outline" className={s.cls}>
          <s.icon className="size-3.5" />
          {s.label}
        </Badge>
      </CardHeader>
      <CardContent className="flex gap-4">
        <div className="size-24 shrink-0 overflow-hidden rounded-lg border bg-muted">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.image}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImageIcon className="size-6" />
            </div>
          )}
        </div>
        <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <Row label="Age" value={profile.age ? `${profile.age} yrs` : "—"} />
          <Row
            label="Height"
            value={profile.height_cm ? `${profile.height_cm} cm` : "—"}
          />
          <Row label="Sub-caste" value={profile.subcaste || "—"} />
          <Row label="Star" value={profile.nakshatram_name || "—"} />
          <Row label="Education" value={profile.education_detail || "—"} />
        </dl>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate capitalize">{value}</dd>
    </>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  desc,
  disabled,
}: {
  href: string;
  icon: typeof Clock;
  title: string;
  desc: string;
  disabled?: boolean;
}) {
  const inner = (
    <Card
      className={
        disabled
          ? "opacity-50"
          : "transition-colors hover:border-primary/40 hover:bg-accent/30"
      }
    >
      <CardContent className="flex items-center gap-3 py-4">
        <Icon className="size-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
      </CardContent>
    </Card>
  );
  if (disabled) return inner;
  return <Link href={href}>{inner}</Link>;
}
