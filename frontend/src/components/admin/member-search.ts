"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { handleApiError } from "@/lib/form";
import type { ModerationProfile, Paginated } from "@/lib/types";

export type Preset = "suspended" | "all";

export interface MemberFilters {
  preset: Preset;
  search: string;
  gender: string;
  subcaste: string[];
  region: string[];
  education: string[];
  marital_status: string;
  status: string;
  plan: string;
  has_photo: string;
  age_min: string;
  age_max: string;
  designation: string;
  work_location: string;
}

export const BLANK_FILTERS: MemberFilters = {
  preset: "all",
  search: "",
  gender: "",
  subcaste: [],
  region: [],
  education: [],
  marital_status: "",
  status: "",
  plan: "",
  has_photo: "",
  age_min: "",
  age_max: "",
  designation: "",
  work_location: "",
};

const SINGLE = [
  "gender", "marital_status", "status", "plan",
  "has_photo", "age_min", "age_max", "designation", "work_location",
] as const;

const MULTI = ["subcaste", "region", "education"] as const;

export function buildMemberQuery(
  f: MemberFilters,
  { limit, offset = 0 }: { limit: number; offset?: number },
): string {
  const p = new URLSearchParams({
    filter: f.preset,
    limit: String(limit),
    offset: String(offset),
  });
  if (f.search.trim()) p.set("search", f.search.trim());
  for (const k of SINGLE) if (f[k].trim()) p.set(k, f[k].trim());
  for (const k of MULTI) for (const v of f[k]) p.append(k, v);
  return p.toString();
}

export const EDUCATION_OPTIONS = [
  { value: "group1", label: "Group 1" },
  { value: "doctor", label: "Doctor" },
  { value: "masters", label: "Masters" },
  { value: "bachelors", label: "Bachelors" },
  { value: "abroad", label: "USA & other countries" },
  { value: "ca_icwai", label: "CA & ICWAI" },
  { value: "pg_mcom", label: "PG, M.Com" },
  { value: "graduate", label: "Graduate & Non Graduate" },
  { value: "remarriage", label: "Second marriage" },
  { value: "other", label: "Others" },
];

/** Lightweight: how many members match, without pulling the rows. */
export function useMatchCount(queryString: string): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    const p = new URLSearchParams(queryString);
    p.set("limit", "1");
    p.set("offset", "0");
    apiFetch<Paginated<ModerationProfile>>(`/moderation/profiles/?${p}`)
      .then((d) => alive && setCount(d.count))
      .catch(() => alive && setCount(null));
    return () => {
      alive = false;
    };
  }, [queryString]);
  return count;
}

export function useMemberList(queryString: string) {
  const [rows, setRows] = useState<ModerationProfile[] | null>(null);
  const [count, setCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  const fetchPage = useCallback(
    (offset: number) => {
      const p = new URLSearchParams(queryString);
      p.set("offset", String(offset));
      if (offset === 0) queueMicrotask(() => setRows(null));
      apiFetch<Paginated<ModerationProfile>>(`/moderation/profiles/?${p}`)
        .then((d) => {
          setCount(d.count);
          setRows((prev) =>
            offset === 0 ? d.results : [...(prev ?? []), ...d.results],
          );
        })
        .catch(handleApiError)
        .finally(() => setLoadingMore(false));
    },
    [queryString],
  );

  useEffect(() => fetchPage(0), [fetchPage]);

  /** Delete a member for good and drop them from the list. */
  const remove = async (id: number) => {
    setBusy(id);
    try {
      await apiFetch(`/moderation/profiles/${id}/`, { method: "DELETE" });
      setRows((prev) => prev?.filter((r) => r.id !== id) ?? null);
      setCount((c) => Math.max(0, c - 1));
    } catch (err) {
      handleApiError(err);
    } finally {
      setBusy(null);
    }
  };

  return {
    rows,
    count,
    busy,
    loadingMore,
    remove,
    loadMore: () => {
      setLoadingMore(true);
      fetchPage(rows?.length ?? 0);
    },
  };
}
