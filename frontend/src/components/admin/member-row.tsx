import Link from "next/link";
import { BadgeCheck, Ban, Check, RotateCcw, SlidersHorizontal, X } from "lucide-react";

import { ConfirmButton } from "@/components/admin/confirm-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ModerationProfile } from "@/lib/types";

export function MemberRow({
  p,
  busy,
  onAct,
}: {
  p: ModerationProfile;
  busy: boolean;
  onAct: (id: number, action: string) => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/admin/members/${p.id}`}
              className="truncate font-medium hover:underline"
            >
              {p.full_name || p.regno}
            </Link>
            {p.is_verified && <BadgeCheck className="size-4 text-primary" />}
            {p.status === "suspended" && (
              <Badge variant="destructive">Suspended</Badge>
            )}
            {p.plan !== "Free" && <Badge variant="secondary">{p.plan}</Badge>}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {p.regno}
            {p.brahmamudi_no ? ` · Brahmamudi no. ${p.brahmamudi_no}` : ""} · {p.email}
            {p.phone ? ` · ${p.phone}` : ""} ·{" "}
            {p.gender === "F" ? "Bride" : "Groom"}
            {p.age ? `, ${p.age}y` : ""} · {p.subcaste || "—"}
            {p.region ? `, ${p.region}` : ""} · {p.photo_count} photo
            {p.photo_count === 1 ? "" : "s"}
            {p.pending_photo_count > 0 && ` (${p.pending_photo_count} pending)`}
          </p>
          {(p.designation || p.work_location || p.education_detail) && (
            <p className="truncate text-xs text-muted-foreground/80">
              {[p.designation || p.occupation, p.work_location, p.education_detail]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/admin/members/${p.id}`} />}
          >
            <SlidersHorizontal className="size-4" />
            Manage
          </Button>
          {p.is_verified ? (
            <ConfirmButton
              size="sm"
              variant="outline"
              disabled={busy}
              title="Remove the verified badge?"
              description={`${p.full_name || p.regno} will no longer show as verified to other members.`}
              confirmLabel="Unverify"
              onConfirm={() => onAct(p.id, "unverify")}
            >
              <X className="size-4" />
              Unverify
            </ConfirmButton>
          ) : (
            <Button size="sm" disabled={busy} onClick={() => onAct(p.id, "verify")}>
              <Check className="size-4" />
              Verify
            </Button>
          )}
          {p.status === "suspended" ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onAct(p.id, "reinstate")}>
              <RotateCcw className="size-4" />
              Reinstate
            </Button>
          ) : (
            <ConfirmButton
              size="sm"
              variant="outline"
              disabled={busy}
              title="Suspend this member?"
              description={`${p.full_name || p.regno}'s profile will be hidden from search and matches until you reinstate it.`}
              confirmLabel="Suspend"
              onConfirm={() => onAct(p.id, "suspend")}
            >
              <Ban className="size-4" />
              Suspend
            </ConfirmButton>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
