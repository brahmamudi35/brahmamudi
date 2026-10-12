"use client";

import { useEffect, useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import type { Paginated, StaffAction } from "@/lib/types";

const LABELS: Record<string, string> = {
  verify: "Verified profile",
  unverify: "Removed verified badge",
  suspend: "Suspended profile",
  reinstate: "Reinstated profile",
  edit_profile: "Edited profile",
  grant_plan: "Granted plan",
  revoke_plan: "Revoked plan",
  approve_photo: "Approved photo",
  reject_photo: "Deleted photo",
  approve_horoscope: "Approved horoscope",
  reject_horoscope: "Removed horoscope",
};

export function describeAction(a: StaffAction): string {
  const base = LABELS[a.action] ?? a.action;
  const d = a.data as Record<string, unknown>;
  if (a.action === "edit_profile" && Array.isArray(d.fields)) {
    return `${base}: ${(d.fields as string[]).join(", ")}`;
  }
  if (a.action === "grant_plan") {
    const paid =
      d.method === "comp" || !Number(d.amount)
        ? "complimentary"
        : `₹${Number(d.amount).toLocaleString("en-IN")} via ${d.method}`;
    return `${base} ${String(d.plan)} (${paid})`;
  }
  if (a.action === "revoke_plan" && d.plan) return `${base} ${String(d.plan)}`;
  return base;
}

/** Staff action history for one member (or everyone when no profileId). */
export function ActivityLog({ profileId, refreshKey }: { profileId?: number; refreshKey?: unknown }) {
  const [rows, setRows] = useState<StaffAction[] | null>(null);

  useEffect(() => {
    let active = true;
    const q = profileId ? `?profile=${profileId}` : "";
    apiFetch<Paginated<StaffAction> | StaffAction[]>(`/moderation/audit/${q}`)
      .then((data) => {
        if (active) setRows(Array.isArray(data) ? data : data.results);
      })
      .catch(() => active && setRows([]));
    return () => {
      active = false;
    };
  }, [profileId, refreshKey]);

  if (!rows) return <Spinner className="text-primary" />;
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No staff actions yet.</p>;
  }
  return (
    <ul className="space-y-2 text-sm">
      {rows.map((a) => (
        <li key={a.id} className="border-l-2 border-primary/30 pl-2">
          <p>{describeAction(a)}</p>
          <p className="text-xs text-muted-foreground">
            {a.actor_email || "deleted staff"} ·{" "}
            {new Date(a.created_at).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </li>
      ))}
    </ul>
  );
}
