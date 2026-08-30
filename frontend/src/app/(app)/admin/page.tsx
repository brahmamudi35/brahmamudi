"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, Ban, Check, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Container } from "@/components/site/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/form";
import type {
  ModerationPhoto,
  ModerationProfile,
  ModerationSummary,
  Paginated,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "profiles" | "photos";
type ProfileFilter = "unverified" | "suspended" | "verified" | "all";

export default function AdminModerationPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profiles");
  const [summary, setSummary] = useState<ModerationSummary | null>(null);

  useEffect(() => {
    if (!loading && user && !user.is_staff) router.replace("/dashboard");
  }, [loading, user, router]);

  const loadSummary = useCallback(() => {
    apiFetch<ModerationSummary>("/moderation/summary/")
      .then(setSummary)
      .catch(() => {});
  }, []);

  useEffect(loadSummary, [loadSummary]);

  if (loading || !user) return null;
  if (!user.is_staff) return null;

  return (
    <Container className="py-6">
      <h1 className="font-heading text-2xl font-semibold">Moderation</h1>

      {summary && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Unverified" value={summary.unverified_profiles} />
          <Stat label="Pending photos" value={summary.pending_photos} />
          <Stat label="Suspended" value={summary.suspended_profiles} />
          <Stat label="New today" value={summary.profiles_created_today} />
        </div>
      )}

      <div className="mt-6 flex gap-2 border-b">
        {(["profiles", "photos"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize",
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "profiles" ? (
          <ProfilesTab onChange={loadSummary} />
        ) : (
          <PhotosTab onChange={loadSummary} />
        )}
      </div>
    </Container>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function ProfilesTab({ onChange }: { onChange: () => void }) {
  const [filter, setFilter] = useState<ProfileFilter>("unverified");
  const [rows, setRows] = useState<ModerationProfile[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(() => {
    setRows(null);
    apiFetch<Paginated<ModerationProfile>>(`/moderation/profiles/?filter=${filter}`)
      .then((d) => setRows(d.results))
      .catch(handleApiError);
  }, [filter]);

  useEffect(load, [load]);

  async function act(id: number, action: string) {
    setBusy(id);
    try {
      await apiFetch(`/moderation/profiles/${id}/${action}/`, { method: "POST" });
      toast.success("Done.");
      load();
      onChange();
    } catch (err) {
      handleApiError(err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        {(["unverified", "verified", "suspended", "all"] as ProfileFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs capitalize",
              filter === f && "border-primary bg-primary/10 text-primary",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {!rows ? (
        <Spinner className="text-primary" />
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/profiles/${p.id}`}
                      className="truncate font-medium hover:underline"
                    >
                      {p.full_name || p.regno}
                    </Link>
                    {p.is_verified && <BadgeCheck className="size-4 text-primary" />}
                    {p.status === "suspended" && (
                      <Badge variant="destructive">Suspended</Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.regno} · {p.email} · {p.age ? `${p.age}y ` : ""}
                    {p.subcaste} · {p.photo_count} photos
                    {p.pending_photo_count > 0 && ` (${p.pending_photo_count} pending)`}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {p.is_verified ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === p.id}
                      onClick={() => act(p.id, "unverify")}
                    >
                      <X className="size-4" /> Unverify
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={busy === p.id}
                      onClick={() => act(p.id, "verify")}
                    >
                      <Check className="size-4" /> Verify
                    </Button>
                  )}
                  {p.status === "suspended" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === p.id}
                      onClick={() => act(p.id, "reinstate")}
                    >
                      <RotateCcw className="size-4" /> Reinstate
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === p.id}
                      onClick={() => act(p.id, "suspend")}
                    >
                      <Ban className="size-4" /> Suspend
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function PhotosTab({ onChange }: { onChange: () => void }) {
  const [rows, setRows] = useState<ModerationPhoto[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(() => {
    setRows(null);
    apiFetch<Paginated<ModerationPhoto>>("/moderation/photos/?filter=pending")
      .then((d) => setRows(d.results))
      .catch(handleApiError);
  }, []);

  useEffect(load, [load]);

  async function approve(id: number) {
    setBusy(id);
    try {
      await apiFetch(`/moderation/photos/${id}/approve/`, { method: "POST" });
      setRows((r) => r?.filter((p) => p.id !== id) ?? null);
      onChange();
    } catch (err) {
      handleApiError(err);
    } finally {
      setBusy(null);
    }
  }

  async function reject(id: number) {
    setBusy(id);
    try {
      await apiFetch(`/moderation/photos/${id}/`, { method: "DELETE" });
      setRows((r) => r?.filter((p) => p.id !== id) ?? null);
      onChange();
    } catch (err) {
      handleApiError(err);
    } finally {
      setBusy(null);
    }
  }

  if (!rows) return <Spinner className="text-primary" />;
  if (rows.length === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No photos waiting for review.
      </p>
    );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {rows.map((p) => (
        <Card key={p.id} className="overflow-hidden">
          <div className="aspect-square bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image} alt="" className="size-full object-cover" />
          </div>
          <CardContent className="space-y-2 py-3">
            <Link
              href={`/profiles/${p.profile_id}`}
              className="block truncate text-xs hover:underline"
            >
              {p.profile_name || p.regno}
            </Link>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="flex-1"
                disabled={busy === p.id}
                onClick={() => approve(p.id)}
              >
                <Check className="size-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={busy === p.id}
                onClick={() => reject(p.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
