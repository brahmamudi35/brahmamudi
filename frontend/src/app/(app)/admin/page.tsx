"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Search, Trash2, UserPlus } from "lucide-react";

import { GuidedSearch, MultiChips } from "@/components/admin/guided-search";
import { MemberRow } from "@/components/admin/member-row";
import { ActivityLog } from "@/components/admin/activity-log";
import { PaymentsTable } from "@/components/admin/payments-table";
import {
  BLANK_FILTERS,
  buildMemberQuery,
  EDUCATION_OPTIONS,
  type MemberFilters,
  useMemberList,
} from "@/components/admin/member-search";
import { Container } from "@/components/site/container";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/form";
import { useReferenceData } from "@/lib/reference";
import type { ModerationPhoto, ModerationSummary, Paginated } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "guided" | "directory" | "payments" | "photos" | "horoscopes" | "activity";
const TABS: { id: Tab; label: string }[] = [
  { id: "guided", label: "Guided search" },
  { id: "directory", label: "Directory" },
  { id: "payments", label: "Payments" },
  { id: "photos", label: "Photos" },
  { id: "horoscopes", label: "Horoscopes" },
  { id: "activity", label: "Activity" },
];

const fieldCls =
  "h-8 rounded-md border bg-background px-2 text-sm outline-none focus-visible:border-ring";

export default function AdminModerationPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("guided");
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

  if (loading || !user || !user.is_staff) return null;

  return (
    <Container className="py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold">Admin</h1>
        <Button size="sm" render={<Link href="/admin/members/new" />}>
          <UserPlus className="size-4" />
          Add member
        </Button>
      </div>

      {summary && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <Stat label="Members" value={summary.total_members} />
          <Stat label="Paid members" value={summary.paid_members} />
          <Stat label="Unverified" value={summary.unverified_profiles} />
          <Stat label="Pending photos" value={summary.pending_photos} />
          <Stat label="Pending horoscopes" value={summary.pending_horoscopes} />
          <Stat label="Suspended" value={summary.suspended_profiles} />
          <Stat label="New today" value={summary.profiles_created_today} />
        </div>
      )}

      <div className="mt-6 flex gap-2 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "guided" && <GuidedSearch onChange={loadSummary} />}
        {tab === "directory" && <DirectoryTab onChange={loadSummary} />}
        {tab === "payments" && <PaymentsTable />}
        {tab === "photos" && <PhotosTab onChange={loadSummary} />}
        {tab === "horoscopes" && <HoroscopesTab onChange={loadSummary} />}
        {tab === "activity" && <ActivityLog />}
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

function DirectoryTab({ onChange }: { onChange: () => void }) {
  const { data: ref } = useReferenceData();
  const [f, setF] = useState<MemberFilters>(BLANK_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(f.search.trim()), 350);
    return () => clearTimeout(t);
  }, [f.search]);

  const query = useMemo(
    () => buildMemberQuery({ ...f, search: debouncedSearch }, { limit: 25 }),
    [f, debouncedSearch],
  );
  const { rows, count, busy, loadingMore, act, loadMore } = useMemberList(query);

  const set = (k: keyof MemberFilters) => (e: { target: { value: string } }) =>
    setF((s) => ({ ...s, [k]: e.target.value }));
  const enums = ref?.enums;
  const dirty = JSON.stringify(f) !== JSON.stringify(BLANK_FILTERS);

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
          <Select v={f.marital_status} on={set("marital_status")} label="Any marital status" opts={enums?.marital_status} />
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
          <input
            value={f.designation}
            onChange={set("designation")}
            placeholder="Position / role"
            className={fieldCls}
          />
          <input
            value={f.work_location}
            onChange={set("work_location")}
            placeholder="Work location"
            className={fieldCls}
          />
        </div>
        <MultiChips
          label="Sub-caste"
          options={enums?.subcaste}
          value={f.subcaste}
          onChange={(v) => setF((s) => ({ ...s, subcaste: v }))}
        />
        <MultiChips
          label="Region"
          options={enums?.region}
          value={f.region}
          onChange={(v) => setF((s) => ({ ...s, region: v }))}
        />
        <MultiChips
          label="Qualification"
          options={EDUCATION_OPTIONS}
          value={f.education}
          onChange={(v) => setF((s) => ({ ...s, education: v }))}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{rows ? `${count.toLocaleString()} members` : "…"}</span>
          {dirty && (
            <button
              onClick={() => setF(BLANK_FILTERS)}
              className="text-primary hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {!rows ? (
        <Spinner className="text-primary" />
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No members match.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <MemberRow
              key={p.id}
              p={p}
              busy={busy === p.id}
              onAct={(id, a) => act(id, a).then(onChange)}
            />
          ))}
          {rows.length < count && (
            <Button
              variant="outline"
              className="w-full"
              disabled={loadingMore}
              onClick={loadMore}
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
            <img src={p.image} alt="" className="size-full object-contain" />
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
                aria-label="Approve photo"
                onClick={() => approve(p.id)}
              >
                <Check className="size-4" />
              </Button>
              <ConfirmButton
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={busy === p.id}
                aria-label="Delete photo"
                title="Delete this photo?"
                description="The photo is removed permanently and the member is notified."
                confirmLabel="Delete photo"
                onConfirm={() => reject(p.id)}
              >
                <Trash2 className="size-4" />
              </ConfirmButton>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface ModHoroscope {
  id: number;
  file: string;
  original_name: string;
  is_pdf: boolean;
  profile_id: number;
  regno: string;
  profile_name: string;
}

function HoroscopesTab({ onChange }: { onChange: () => void }) {
  const [rows, setRows] = useState<ModHoroscope[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(() => {
    apiFetch<Paginated<ModHoroscope>>("/moderation/horoscopes/?filter=pending")
      .then((d) => setRows(d.results))
      .catch(handleApiError);
  }, []);
  useEffect(load, [load]);

  async function act(id: number, method: "approve" | "reject") {
    setBusy(id);
    try {
      if (method === "approve")
        await apiFetch(`/moderation/horoscopes/${id}/approve/`, { method: "POST" });
      else await apiFetch(`/moderation/horoscopes/${id}/`, { method: "DELETE" });
      setRows((r) => r?.filter((x) => x.id !== id) ?? null);
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
        No horoscopes waiting for review.
      </p>
    );

  return (
    <div className="space-y-2">
      {rows.map((h) => (
        <Card key={h.id}>
          <CardContent className="flex flex-wrap items-center gap-3 py-3">
            <a
              href={h.file}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 flex-1 items-center gap-2 hover:underline"
            >
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                {h.is_pdf ? "PDF" : "IMG"}
              </span>
              <span className="truncate text-sm">
                {h.profile_name || h.regno} · {h.original_name || "horoscope"}
              </span>
            </a>
            <div className="flex gap-1.5">
              <Button size="sm" disabled={busy === h.id} onClick={() => act(h.id, "approve")}>
                <Check className="size-4" /> Approve
              </Button>
              <ConfirmButton
                size="sm"
                variant="outline"
                disabled={busy === h.id}
                aria-label="Remove horoscope"
                title="Remove this horoscope?"
                description="The document is deleted permanently and the member is notified."
                confirmLabel="Remove"
                onConfirm={() => act(h.id, "reject")}
              >
                <Trash2 className="size-4" />
              </ConfirmButton>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
