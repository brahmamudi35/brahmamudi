"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Minus, Sparkles, X } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/lib/api";
import type { ApiError, Porutham } from "@/lib/types";
import { cn } from "@/lib/utils";

const VERDICT: Record<
  Porutham["verdict"],
  { label: string; tone: string }
> = {
  excellent: { label: "Excellent match", tone: "text-emerald-600" },
  acceptable: { label: "Acceptable match", tone: "text-amber-600" },
  poor: { label: "Weak match", tone: "text-orange-600" },
  not_recommended: { label: "Not recommended", tone: "text-red-600" },
  unknown: { label: "Not enough data", tone: "text-muted-foreground" },
};

export function PoruthamCard({ profileId }: { profileId: number }) {
  const [data, setData] = useState<Porutham | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    apiFetch<Porutham>(`/profiles/${profileId}/porutham/`)
      .then((d) => alive && setData(d))
      .catch((e: ApiError) => alive && setError(e.detail));
    return () => {
      alive = false;
    };
  }, [profileId]);

  if (error) return null; // e.g. same-gender profiles: nothing to show

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="flex items-center gap-2 font-medium">
          <Sparkles className="size-4 text-primary" />
          Porutham compatibility
        </h2>

        {!data ? (
          <p className="mt-3 text-sm text-muted-foreground">Calculating…</p>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className={cn("font-medium", VERDICT[data.verdict].tone)}>
                {VERDICT[data.verdict].label}
              </span>
              {data.percent != null && (
                <span className="text-sm text-muted-foreground">
                  {data.passed}/{data.graded} poruthams
                </span>
              )}
            </div>

            {data.percent != null && <Progress value={data.percent} />}

            <p className="text-sm text-muted-foreground">{data.summary}</p>

            {data.graded > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  {open ? "Hide" : "Show"} the breakdown
                  <ChevronDown
                    className={cn("size-4 transition-transform", open && "rotate-180")}
                  />
                </button>

                {open && (
                  <ul className="space-y-1.5 border-t pt-3 text-sm">
                    {data.checks.map((c) => (
                      <li key={c.key} className="flex gap-2">
                        <Mark ok={c.ok} />
                        <span>
                          <span className="font-medium">{c.label}</span>
                          <span className="text-muted-foreground"> — {c.note}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            <p className="text-xs text-muted-foreground">
              A guide based on birth-star details, not a substitute for an
              astrologer.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Mark({ ok }: { ok: boolean | null }) {
  if (ok === null)
    return <Minus className="mt-0.5 size-4 shrink-0 text-muted-foreground" />;
  return ok ? (
    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
  ) : (
    <X className="mt-0.5 size-4 shrink-0 text-red-600" />
  );
}
