import Link from "next/link";
import { BadgeCheck, Ban, Check, RotateCcw, X } from "lucide-react";

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
              href={`/profiles/${p.id}`}
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
            {p.regno} · {p.email}
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
            variant={p.is_verified ? "outline" : "default"}
            disabled={busy}
            onClick={() => onAct(p.id, p.is_verified ? "unverify" : "verify")}
          >
            {p.is_verified ? <X className="size-4" /> : <Check className="size-4" />}
            {p.is_verified ? "Unverify" : "Verify"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              onAct(p.id, p.status === "suspended" ? "reinstate" : "suspend")
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
  );
}
