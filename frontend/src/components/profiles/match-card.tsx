import Link from "next/link";
import { BadgeCheck, MapPin, Sparkles } from "lucide-react";

import type { SuggestedProfile } from "@/lib/types";

function heightLabel(cm: number | null) {
  if (!cm) return null;
  const inch = Math.round(cm / 2.54);
  return `${Math.floor(inch / 12)}′${inch % 12}″`;
}

export function MatchCard({ profile }: { profile: SuggestedProfile }) {
  const facts = [
    profile.age ? `${profile.age} yrs` : null,
    heightLabel(profile.height_cm),
    profile.subcaste,
  ]
    .filter(Boolean)
    .join(" · ");

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
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-xs font-medium backdrop-blur">
          <Sparkles className="size-3 text-primary" />
          {profile.match.score}% match
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-center gap-1">
          <span className="truncate font-medium">{profile.first_name}</span>
          {profile.is_verified && (
            <BadgeCheck className="size-4 shrink-0 text-primary" />
          )}
        </div>
        <p className="text-xs capitalize text-muted-foreground">{facts}</p>
        {(profile.city_display || profile.country_living) && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            {[profile.city_display, profile.country_living]
              .filter(Boolean)
              .join(", ")}
          </p>
        )}
        {profile.match.reasons.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-1">
            {profile.match.reasons.map((r) => (
              <li
                key={r}
                className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] capitalize text-primary"
              >
                {r}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}
