"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  FileText,
  Heart,
  Lock,
  Phone,
} from "lucide-react";
import { toast } from "sonner";

import { SendInterestDialog } from "@/components/interests/send-interest-dialog";
import { PoruthamCard } from "@/components/profiles/porutham-card";
import { Container } from "@/components/site/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { handleApiError } from "@/lib/form";
import type { ContactQuota, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

function heightLabel(cm: number | null) {
  if (!cm) return "—";
  const inch = Math.round(cm / 2.54);
  return `${Math.floor(inch / 12)}′ ${inch % 12}″ (${cm} cm)`;
}
const cap = (s: string) => (s ? s.replace(/_/g, " ") : "—");

export default function ProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [unlocking, setUnlocking] = useState(false);

  const load = useCallback(() => {
    apiFetch<Profile>(`/profiles/${id}/`)
      .then((p) => {
        setProfile(p);
        setShortlisted(!!p.is_shortlisted);
      })
      .catch(() => setNotFound(true));
  }, [id]);

  useEffect(load, [load]);

  async function toggleShortlist() {
    const next = !shortlisted;
    setShortlisted(next);
    try {
      await apiFetch(`/profiles/${id}/shortlist/`, {
        method: next ? "POST" : "DELETE",
      });
    } catch {
      setShortlisted(!next);
    }
  }

  async function unlockContact() {
    setUnlocking(true);
    try {
      const data = await apiFetch<Profile & { quota: ContactQuota }>(
        `/profiles/${id}/unlock-contact/`,
        { method: "POST" },
      );
      setProfile(data);
      const left = data.quota?.remaining;
      toast.success(
        left == null
          ? "Contact details unlocked."
          : `Contact unlocked · ${left} left this plan.`,
      );
    } catch (err) {
      const e = err as { status?: number; code?: string; detail?: string };
      if (e.status === 402) {
        toast.error(e.detail ?? "Upgrade your membership to view contact details.");
        router.push("/membership");
      } else {
        handleApiError(err);
      }
    } finally {
      setUnlocking(false);
    }
  }

  if (notFound) {
    return (
      <Container className="py-16 text-center">
        <p className="text-muted-foreground">This profile isn&apos;t available.</p>
        <Button variant="outline" className="mt-4" render={<Link href="/search" />}>
          Back to search
        </Button>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container className="grid gap-6 py-8 lg:grid-cols-[2fr_1fr]">
        <Skeleton className="aspect-[3/4] w-full" />
        <Skeleton className="h-64 w-full" />
      </Container>
    );
  }

  const photos = profile.photos?.filter((p) => p.is_approved) ?? [];
  const facts: [string, string][] = [
    ["Age", profile.age ? `${profile.age} years` : "—"],
    ["Height", heightLabel(profile.height_cm)],
    ["Marital status", cap(profile.marital_status)],
    ["Complexion", cap(profile.complexion)],
    ["Food habits", cap(profile.food_habit)],
  ];
  const community: [string, string][] = [
    ["Sub-caste", cap(profile.subcaste)],
    ["Gothram", profile.gothram || "—"],
    ["Nakshatram", profile.nakshatram_name || "—"],
    ["Raasi", profile.raasi_name || "—"],
    ["Paadam", profile.paadam ? String(profile.paadam) : "—"],
    ["Time of birth", profile.time_of_birth || "—"],
    ["Place of birth", profile.place_of_birth || "—"],
  ];
  const career: [string, string][] = [
    ["Education", profile.education_detail || "—"],
    ["Occupation", profile.occupation || "—"],
    ["Company", profile.company || "—"],
    ["Work location", profile.work_location || "—"],
    ["Annual income", profile.annual_income_text || "—"],
  ];
  const location: [string, string][] = [
    ["Living in", profile.country_living || "—"],
    ["Native district", profile.native_district || "—"],
    ["Settled at", profile.settled_at || "—"],
    ["Region", cap(profile.region)],
  ];
  const family: [string, string][] = [
    ["Father", profile.father_name || "—"],
    ["Father's occupation", profile.father_occupation || "—"],
    ["Mother", profile.mother_name || "—"],
    ["Mother's occupation", profile.mother_occupation || "—"],
  ];

  return (
    <Container className="py-6">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        render={<Link href="/search" />}
      >
        <ArrowLeft className="size-4" />
        Search
      </Button>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {/* Gallery */}
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="aspect-[3/4] bg-muted">
              {photos.length ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photos[activePhoto]?.image}
                  alt={profile.first_name}
                  className="size-full object-contain"
                />
              ) : (
                <div className="flex size-full items-center justify-center font-heading text-6xl text-primary/30">
                  {profile.first_name?.[0]}
                </div>
              )}
            </div>
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-2">
                {photos.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePhoto(i)}
                    className={cn(
                      "size-16 shrink-0 overflow-hidden rounded-md border-2",
                      i === activePhoto ? "border-primary" : "border-transparent",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image} alt="" className="size-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {profile.about && <Prose title="About" text={profile.about} />}

          <Section title="Basic details" rows={facts} />
          <Section title="Community & horoscope" rows={community} />
          <Section title="Education & career" rows={career} />
          <Section title="Location" rows={location} />
          <Section title="Family" rows={family} />
          {profile.family_background && (
            <Prose title="About the family" text={profile.family_background} />
          )}
          {profile.expectations && (
            <Prose title="Partner expectations" text={profile.expectations} />
          )}
        </div>

        {/* Action sidebar */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-heading text-2xl font-semibold">
                    {profile.full_name || profile.first_name}
                  </h1>
                  {profile.is_verified && (
                    <BadgeCheck className="size-5 text-primary" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {profile.education_detail || "—"}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 text-sm capitalize">
                {[
                  profile.age && `${profile.age} yrs`,
                  heightLabel(profile.height_cm),
                  cap(profile.subcaste),
                  cap(profile.region),
                ]
                  .filter(Boolean)
                  .map((x) => (
                    <Badge key={String(x)} variant="secondary">
                      {x}
                    </Badge>
                  ))}
              </div>

              <Separator />

              <SendInterestDialog
                profileId={profile.id}
                name={profile.first_name}
              />

              <Button
                variant="outline"
                className="w-full"
                onClick={toggleShortlist}
              >
                <Heart
                  className={cn(
                    "size-4",
                    shortlisted && "fill-primary text-primary",
                  )}
                />
                {shortlisted ? "Shortlisted" : "Add to shortlist"}
              </Button>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="flex items-center gap-2 font-medium">
                <Phone className="size-4 text-primary" />
                Contact details
              </h2>
              {profile.contact_locked ? (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
                    <Lock className="size-4" />
                    Hidden until you unlock this profile.
                  </div>
                  <Button
                    className="w-full"
                    onClick={unlockContact}
                    disabled={unlocking}
                  >
                    {unlocking && <Spinner />}
                    Unlock contact
                  </Button>
                </div>
              ) : (
                <dl className="mt-3 space-y-2 text-sm">
                  <ContactRow label="Mobile" value={profile.contact_phone} />
                  <ContactRow label="Parent's mobile" value={profile.parent_phone} />
                  {profile.address && (
                    <div>
                      <dt className="text-muted-foreground">Address</dt>
                      <dd>{profile.address}</dd>
                    </div>
                  )}
                </dl>
              )}
            </CardContent>
          </Card>

          {profile.horoscope && profile.horoscope.status !== "none" && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="flex items-center gap-2 font-medium">
                  <FileText className="size-4 text-primary" />
                  Horoscope
                </h2>
                {profile.horoscope.locked ? (
                  <p className="mt-3 flex items-center gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
                    <Lock className="size-4" />
                    Unlock this profile to view the horoscope.
                  </p>
                ) : profile.horoscope.url ? (
                  <Button
                    variant="outline"
                    className="mt-3 w-full"
                    render={
                      <a
                        href={profile.horoscope.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                  >
                    <FileText className="size-4" />
                    View {profile.horoscope.is_pdf ? "PDF" : "image"}
                  </Button>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Awaiting review.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <PoruthamCard profileId={profile.id} />
        </div>
      </div>
    </Container>
  );
}

function Section({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="mb-3 font-heading text-lg font-semibold">{title}</h2>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b py-1.5 last:border-0">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right capitalize">{v}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function Prose({ title, text }: { title: string; text: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="mb-2 font-heading text-lg font-semibold">{title}</h2>
        <p className="whitespace-pre-line text-sm text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}

function ContactRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>
        <a href={`tel:${value}`} className="text-primary hover:underline">
          {value}
        </a>
      </dd>
    </div>
  );
}
