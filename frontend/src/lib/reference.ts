"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { Choice, EducationLevel, Enums, Nakshatram, Raasi } from "@/lib/types";

export interface ReferenceData {
  enums: Enums;
  nakshatram: Nakshatram[];
  raasi: Raasi[];
  education: EducationLevel[];
}

let cache: ReferenceData | null = null;

export function useReferenceData() {
  const [data, setData] = useState<ReferenceData | null>(cache);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (cache) return;
    Promise.all([
      apiFetch<Enums>("/reference/enums/", { auth: false }),
      apiFetch<Nakshatram[]>("/reference/nakshatram/", { auth: false }),
      apiFetch<Raasi[]>("/reference/raasi/", { auth: false }),
      apiFetch<EducationLevel[]>("/reference/education-levels/", { auth: false }),
    ])
      .then(([enums, nakshatram, raasi, education]) => {
        cache = { enums, nakshatram, raasi, education };
        setData(cache);
      })
      .catch(() => setError(true));
  }, []);

  return { data, error };
}

export const toChoices = <T extends { id: number; name: string }>(
  rows: T[],
): Choice[] => rows.map((r) => ({ value: r.id, label: r.name }));
