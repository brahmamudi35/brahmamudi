import { API_BASE } from "@/lib/api";

/** Server-side fetch of public, unauthenticated data (safe to cache). */
async function publicGet<T>(path: string, revalidate = 600): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface PublicStats {
  active_profiles: number;
  brides: number;
  grooms: number;
}

export function getStats() {
  return publicGet<PublicStats>("/stats/");
}
