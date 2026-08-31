"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, Ban, Check, RotateCcw, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Container } from "@/components/site/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/form";
import { useReferenceData } from "@/lib/reference";
import type {
  ModerationPhoto,
  ModerationProfile,
  ModerationSummary,
  Paginated,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "profiles" | "photos";
type Preset = "unverified" | "suspended" | "verified" | "all";

const PAGE = 25;
const fieldCls =
  "h-8 rounded-md border bg-background px-2 text-sm outline-none focus-visible:border-ring";

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

const BLANK = {
  preset: "unverified" as Preset,
  search: "",
  gender: "",
  subcaste: "",
  region: "",
  status: "",
  is_verified: "",
  plan: "",
  has_photo: "",
  age_min: "",
  age_max: "",
};
type Filters = typeof BLANK;

function ProfilesTab({ onChange }: { onChange: () => void }) {
  const { data: ref } = useReferenceData();
  const [f, setF] = useState<Filters>(BLANK);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState<ModerationProfile[] | null>(null);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(f.search.trim()), 350);
    return () => clearTimeout(t);
  }, [f.search]);

  const query = useMemo(() => {
    const p = new URLSearchParams({ filter: f.preset, limit: String(PAGE) });
    if (debouncedSearch) p.set("search", debouncedSearch);
    for (const k of ["gender", "subcaste", "region", "status", "is_verified",
      "plan", "has_photo", "age_min", "age_max"] as const) {
      if (f[k]) p.set(k, f[k]);
    }
    return p;
  }, [f, debouncedSearch]);

  const load = useCallback(
    (offset = 0) => {
      const p = new URLSearchParams(query);
      p.set("offset", String(offset));
      if (offset === 0) setRows(null);
      else setLoadingMore(true);
      apiFetch<Paginated<ModerationProfile>>(`/moderation/profiles/?${p}`)
        .then((d) => {
          setCount(d.count);
          setRows((prev) => (offset === 0 ? d.results : [...(prev ?? []), ...d.results]));
        })
        .catch(handleApiError)
        .finally(() => setLoadingMore(false));
    },
    [query],
  );

  useEffect(() => load(0), [load]);

  async function act(id: number, action: string) {
    setBusy(id);
    try {
      await apiFetch(`/moderation/profiles/${id}/${action}/`, { method: "POST" });
      setRows((prev) =>
        prev?.map((r) =>
          r.id !== id
            ? r
            : {
                ...r,
                is_verified: action === "verify" ? true : action === "unverify" ? false : r.is_verified,
                status:
                  action === "suspend" ? "suspended" : action === "reinstate" ? "active" : r.status,
              },
        ) ?? null,
      );
      onChange();
    } catch (err) {
      handleApiError(err);
    } finally {
      setBusy(null);
    }
  }

  const set = (k: keyof Filters) => (e: { target: { value: string } }) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const enums = ref?.enums;
  const dirty = JSON.stringify(f) !== JSON.stringify(BLANK);

  return (
    <>
      <div className="mb-4 space-y-2 rounded-xl border bg-muted/20 p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
          <input
            value={f.search}
            onChange={set("search")}
            placeholder="Name, reg. no, email, phone, occupation…"
            className={cn(fieldCls, "w-full pl-8")}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          <select value={f.preset} onChange={set("preset")} className={fieldCls}>
            <option value="unverified">Queue: unverified</option>
            <option value="verified">Verified</option>
            <option value="suspended">Suspended</option>
            <option value="all">All members</option>
          </select>
          <Select v={f.gender} on={set("gender")} label="Any gender" opts={enums?.gender} />
          <Select v={f.subcaste} on={set("subcaste")} label="Any sub-caste" opts={enums?.subcaste} />
          <Select v={f.region} on={set("region")} label="Any region" opts={enums?.region} />
          <Select v={f.status} on={set("status")} label="Any status" opts={enums?.profile_status} />
          <select value={f.is_verified} onChange={set("is_verified")} className={fieldCls}>
            <option value="">Verified: any</option>
            <option value="true">Verified only</option>
            <option value="false">Not verified</option>
          </select>
          <select value={f.plan} onChange={set("plan")} className={fieldCls}>
            <option value="">Any plan</option>
            <option value="none">No paid plan</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
          </select>
          <select value={f.has_photo} onChange={set("has_photo")} className={fieldCls}>
            <option value="">Photos: any</option>
            <option value="yes">Has approved photo</option>
            <option value="no">No photo</option>
            <option value="pending">Photo pending review</option>
          </select>
          <input
            value={f.age_min}
            onChange={set("age_min")}
            inputMode="numeric"
            placeholder="Age min"
            className={fieldCls}
          />
          <input
            value={f.age_max}
            onChange={set("age_max")}
            inputMode="numeric"
            placeholder="Age max"
            className={fieldCls}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{rows ? `${count.toLocaleString()} members` : "…"}</span>
          {dirty && (
            <button onClick={() => setF(BLANK)} className="text-primary hover:underline">
              Reset filters
            </button>
          )}
        </div>
      </div>

      {!rows ? (
        <Spinner className="text-primary" />
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No members match.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link
                      href={`/profiles/${p.id}`}
                      className="truncate font-medium hover:underline"
                    >
                      {p.full_name || p.regno}
                    </Link>
                    {p.is_verified && <BadgeCheck className="size-4 text-primary" />}
                    {p.status === "suspended" && <Badge variant="destructive">Suspended</Badge>}
                    {p.plan !== "Free" && <Badge variant="secondary">{p.plan}</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.regno} · {p.email}
                    {p.phone ? ` · ${p.phone}` : ""} · {p.gender === "F" ? "Bride" : "Groom"}
                    {p.age ? `, ${p.age}y` : ""} · {p.subcaste || "—"}
                    {p.region ? `, ${p.region}` : ""} · {p.photo_count} photo
                    {p.photo_count === 1 ? "" : "s"}
                    {p.pending_photo_count > 0 && ` (${p.pending_photo_count} pending)`}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant={p.is_verified ? "outline" : "default"}
                    disabled={busy === p.id}
                    onClick={() => act(p.id, p.is_verified ? "unverify" : "verify")}
                  >
                    {p.is_verified ? <X className="size-4" /> : <Check className="size-4" />}
                    {p.is_verified ? "Unverify" : "Verify"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === p.id}
                    onClick={() =>
                      act(p.id, p.status === "suspended" ? "reinstate" : "suspend")
                    }
                  >
                    {p.status === "suspended" ? (
                      <RotateCcw className="size-4" />
                    ) : (
                      <Ban className="size-4" />
                    )}
                    {p.status === "suspended" ? "Reinstate" : "Suspend"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {rows.length < count && (
            <Button
              variant="outline"
              className="w-full"
              disabled={loadingMore}
              onClick={() => load(rows.length)}
            >
              {loadingMore ? <Spinner /> : `Load more (${count - rows.length} left)`}
            </Button>
          )}
        </div>
      )}
    </>
  );
}

function Select({
  v,
  on,
  label,
  opts,
}: {
  v: string;
  on: (e: { target: { value: string } }) => void;
  label: string;
  opts?: { value: string | number; label: string }[];
}) {
  return (
    <select value={v} onChange={on} className={fieldCls}>
      <option value="">{label}</option>
      {opts?.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
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
