"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, Heart, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import type { ProfileSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

function heightLabel(cm: number | null) {
  if (!cm) return null;
  const inch = Math.round(cm / 2.54);
  return `${Math.floor(inch / 12)}′${inch % 12}″`;
}

export function ProfileCard({
  profile,
  shortlisted: initialShortlisted,
}: {
  profile: ProfileSummary;
  shortlisted?: boolean;
}) {
  const [shortlisted, setShortlisted] = useState(!!initialShortlisted);
  const [pending, setPending] = useState(false);

  async function toggleShortlist(e: React.MouseEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    const nextState = !shortlisted;
    setShortlisted(nextState);
    try {
      await apiFetch(`/profiles/${profile.id}/shortlist/`, {
        method: nextState ? "POST" : "DELETE",
      });
    } catch {
      setShortlisted(!nextState);
    } finally {
      setPending(false);
    }
  }

  const facts = [
    profile.age ? `${profile.age} yrs` : null,
    heightLabel(profile.height_cm),
    profile.subcaste,
  ].filter(Boolean);

  return (
    <Link
      href={`/profiles/${profile.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {profile.primary_photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.primary_photo}
            alt={profile.first_name}
            className="size-full object-contain transition-transform group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-accent/50 to-muted font-heading text-5xl text-primary/40">
            {profile.first_name?.[0] ?? "?"}
          </div>
        )}
        <button
          type="button"
          onClick={toggleShortlist}
          aria-label={shortlisted ? "Remove from shortlist" : "Add to shortlist"}
          className="absolute right-2 top-2 rounded-full bg-background/85 p-1.5 backdrop-blur transition-colors hover:bg-background"
        >
          <Heart
            className={cn(
              "size-4",
              shortlisted ? "fill-primary text-primary" : "text-muted-foreground",
            )}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-center gap-1">
          <span className="truncate font-medium">{profile.first_name}</span>
          {profile.is_verified && (
            <BadgeCheck className="size-4 shrink-0 text-primary" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">{profile.regno}</p>
        <p className="mt-1 text-sm capitalize text-muted-foreground">
          {facts.join(" · ")}
        </p>
        {profile.education_detail && (
          <p className="truncate text-sm">{profile.education_detail}</p>
        )}
        {(profile.city_display || profile.country_living) && (
          <p className="mt-auto flex items-center gap-1 pt-1 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            {[profile.city_display, profile.country_living]
              .filter(Boolean)
              .join(", ")}
          </p>
        )}
      </div>
    </Link>
  );
}

export function ProfileCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="aspect-[4/5] animate-pulse bg-muted" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function VerifiedBadge() {
  return (
    <Badge variant="outline" className="text-primary">
      <BadgeCheck className="size-3.5" />
      Verified
    </Badge>
  );
}
