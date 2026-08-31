"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { MatchCard } from "@/components/profiles/match-card";
import { ProfileCardSkeleton } from "@/components/profiles/profile-card";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { SuggestedProfile } from "@/lib/types";

export default function MatchesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SuggestedProfile[] | null>(null);
  const noProfile = !!user && !user.has_profile;

  useEffect(() => {
    if (noProfile) return;
    apiFetch<SuggestedProfile[]>("/profiles/suggestions/?limit=30")
      .then(setRows)
      .catch(() => setRows([]));
  }, [noProfile]);

  return (
    <Container className="py-6">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-primary" />
        <h1 className="font-heading text-2xl font-semibold">Matches for you</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Ranked by your partner preferences and porutham compatibility.
      </p>

      {noProfile ? (
        <div className="mt-8 rounded-xl border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Create your profile to see matches.
          </p>
          <Button className="mt-4" render={<Link href="/onboarding" />}>
            Create profile
          </Button>
        </div>
      ) : !rows ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProfileCardSkeleton key={i} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No suggestions yet. Add your partner preferences and horoscope, or
            browse the full search.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            render={<Link href="/search" />}
          >
            Go to search
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((p) => (
            <MatchCard key={p.id} profile={p} />
          ))}
        </div>
      )}
    </Container>
  );
}
