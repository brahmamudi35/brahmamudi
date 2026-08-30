"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HeartOff } from "lucide-react";

import {
  ProfileCard,
  ProfileCardSkeleton,
} from "@/components/profiles/profile-card";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { Paginated, ProfileSummary } from "@/lib/types";

export default function ShortlistPage() {
  const [items, setItems] = useState<ProfileSummary[] | null>(null);

  useEffect(() => {
    apiFetch<Paginated<ProfileSummary>>("/profiles/me/shortlist/")
      .then((d) => setItems(d.results))
      .catch(() => setItems([]));
  }, []);

  return (
    <Container className="py-6">
      <h1 className="font-heading text-2xl font-semibold">Shortlist</h1>
      <p className="text-sm text-muted-foreground">Profiles you&apos;ve saved.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {items === null ? (
          Array.from({ length: 4 }).map((_, i) => <ProfileCardSkeleton key={i} />)
        ) : items.length === 0 ? (
          <div className="col-span-full flex flex-col items-center gap-3 rounded-xl border border-dashed py-20 text-center text-muted-foreground">
            <HeartOff className="size-8" />
            <p>Your shortlist is empty.</p>
            <Button variant="outline" size="sm" render={<Link href="/search" />}>
              Browse profiles
            </Button>
          </div>
        ) : (
          items.map((p) => (
            <ProfileCard key={p.id} profile={p} shortlisted />
          ))
        )}
      </div>
    </Container>
  );
}
