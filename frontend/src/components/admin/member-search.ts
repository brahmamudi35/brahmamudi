"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { handleApiError } from "@/lib/form";
import type { ModerationProfile, Paginated } from "@/lib/types";

export type Preset = "unverified" | "verified" | "suspended" | "all";

export interface MemberFilters {
  preset: Preset;
  search: string;
  gender: string;
  subcaste: string[];
  region: string[];
  marital_status: string;
  status: string;
  is_verified: string;
  plan: string;
  has_photo: string;
  age_min: string;
  age_max: string;
}

export const BLANK_FILTERS: MemberFilters = {
  preset: "unverified",
  search: "",
  gender: "",
  subcaste: [],
  region: [],
  marital_status: "",
  status: "",
  is_verified: "",
  plan: "",
  has_photo: "",
  age_min: "",
  age_max: "",
};

const SINGLE = [
  "gender", "marital_status", "status", "is_verified", "plan",
  "has_photo", "age_min", "age_max",
] as const;

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
  for (const k of SINGLE) if (f[k]) p.set(k, f[k]);
  for (const v of f.subcaste) p.append("subcaste", v);
  for (const v of f.region) p.append("region", v);
  return p.toString();
}

/** Lightweight: how many members match, without pulling the rows. */
export function useMatchCount(queryString: string): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    setCount(null);
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
      if (offset === 0) setRows(null);
      else setLoadingMore(true);
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

  const act = async (id: number, action: string) => {
    setBusy(id);
    try {
      await apiFetch(`/moderation/profiles/${id}/${action}/`, { method: "POST" });
      setRows((prev) =>
        prev?.map((r) =>
          r.id !== id
            ? r
            : {
                ...r,
                is_verified:
                  action === "verify"
                    ? true
                    : action === "unverify"
                      ? false
                      : r.is_verified,
                status:
                  action === "suspend"
                    ? "suspended"
                    : action === "reinstate"
                      ? "active"
                      : r.status,
              },
        ) ?? null,
      );
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
    act,
    loadMore: () => fetchPage(rows?.length ?? 0),
  };
}
