import Link from "next/link";
import { SlidersHorizontal, Trash2 } from "lucide-react";

import { ConfirmButton } from "@/components/admin/confirm-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ModerationProfile } from "@/lib/types";

/** "Delete profile", behind a confirmation: the member is removed for good. */
export function DeleteMemberButton({
  name,
  disabled,
  onConfirm,
}: {
  name: string;
  disabled?: boolean;
  onConfirm: () => Promise<unknown> | unknown;
}) {
  return (
    <ConfirmButton
      size="sm"
      variant="outline"
      disabled={disabled}
      title="Delete this profile?"
      description={`${name}'s login and profile are deleted permanently, with their photos, horoscope and interests. Payment records and the activity log are kept. This can't be undone.`}
      confirmLabel="Delete profile"
      onConfirm={onConfirm}
    >
      <Trash2 className="size-4" />
      Delete profile
    </ConfirmButton>
  );
}

export function MemberRow({
  p,
  busy,
  onDelete,
}: {
  p: ModerationProfile;
  busy: boolean;
  onDelete: (id: number) => Promise<unknown> | unknown;
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
          <DeleteMemberButton
            name={p.full_name || p.regno}
            disabled={busy}
            onConfirm={() => onDelete(p.id)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
