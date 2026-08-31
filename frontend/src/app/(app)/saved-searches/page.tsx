"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { handleApiError } from "@/lib/form";
import type { SavedSearch } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  search: "keyword",
  age_min: "age from",
  age_max: "age to",
  height_min: "height from",
  height_max: "height to",
  subcaste: "sub-caste",
  marital_status: "marital status",
  region: "region",
  food_habit: "food",
  nakshatram: "star",
  gothram: "gothram",
  country_living: "country",
};

function summarise(f: SavedSearch["filters"]): string {
  const parts = Object.entries(f).map(([k, v]) => {
    const val = Array.isArray(v) ? v.join(" / ") : v;
    return `${LABELS[k] ?? k}: ${val}`;
  });
  return parts.length ? parts.join(" · ") : "everyone";
}

export default function SavedSearchesPage() {
  const [rows, setRows] = useState<SavedSearch[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(() => {
    apiFetch<SavedSearch[]>("/saved-searches/")
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  useEffect(load, [load]);

  async function toggleAlerts(s: SavedSearch) {
    setBusy(s.id);
    try {
      const updated = await apiFetch<SavedSearch>(`/saved-searches/${s.id}/`, {
        method: "PATCH",
        body: { alerts_enabled: !s.alerts_enabled },
      });
      setRows((prev) => prev?.map((x) => (x.id === s.id ? updated : x)) ?? null);
    } catch (err) {
      handleApiError(err);
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: number) {
    setBusy(id);
    try {
      await apiFetch(`/saved-searches/${id}/`, { method: "DELETE" });
      setRows((prev) => prev?.filter((x) => x.id !== id) ?? null);
      toast.success("Saved search deleted.");
    } catch (err) {
      handleApiError(err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Container className="max-w-2xl py-6">
      <h1 className="font-heading text-2xl font-semibold">Saved searches</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Turn on alerts to get an email when new profiles match.
      </p>

      {!rows ? (
        <div className="mt-8 flex justify-center">
          <Spinner className="text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">No saved searches yet.</p>
          <Button className="mt-4" render={<Link href="/search" />}>
            <Search className="size-4" />
            Go to search
          </Button>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {rows.map((s) => (
            <Card key={s.id}>
              <CardContent className="space-y-2 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{s.name}</p>
                    <p className="truncate text-xs capitalize text-muted-foreground">
                      {summarise(s.filters)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {s.match_count ?? "…"} matches
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    render={
                      <Link href={`/search?saved=${s.id}`} />
                    }
                  >
                    <Search className="size-4" />
                    View results
                  </Button>
                  <Button
                    size="sm"
                    variant={s.alerts_enabled ? "default" : "outline"}
                    disabled={busy === s.id}
                    onClick={() => toggleAlerts(s)}
                  >
                    <BellRing className="size-4" />
                    {s.alerts_enabled ? "Alerts on" : "Alerts off"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn("ml-auto text-muted-foreground")}
                    disabled={busy === s.id}
                    onClick={() => remove(s.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
