"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";

import { Container } from "@/components/site/container";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import type { Paginated, ProfileSummary } from "@/lib/types";

interface Visit {
  profile: ProfileSummary;
  view_count: number;
  last_viewed_at: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function VisitorsPage() {
  const [items, setItems] = useState<Visit[] | null>(null);

  useEffect(() => {
    apiFetch<Paginated<Visit>>("/profiles/me/visitors/")
      .then((d) => setItems(d.results))
      .catch(() => setItems([]));
  }, []);

  return (
    <Container className="max-w-3xl py-6">
      <h1 className="font-heading text-2xl font-semibold">Who viewed me</h1>

      <div className="mt-6 space-y-3">
        {items === null ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
            <Eye className="mx-auto mb-2 size-6" />
            No one has viewed your profile yet.
          </p>
        ) : (
          items.map((v) => (
            <Card key={v.profile.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="size-12 shrink-0 overflow-hidden rounded-full bg-muted">
                  {v.profile.primary_photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.profile.primary_photo}
                      alt=""
                      className="size-full object-contain"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center font-heading text-primary/40">
                      {v.profile.first_name?.[0]}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profiles/${v.profile.id}`}
                    className="font-medium hover:underline"
                  >
                    {v.profile.first_name}
                  </Link>
                  <p className="truncate text-sm capitalize text-muted-foreground">
                    {[
                      v.profile.age && `${v.profile.age} yrs`,
                      v.profile.subcaste,
                      v.profile.city_display,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {timeAgo(v.last_viewed_at)}
                </span>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </Container>
  );
}
