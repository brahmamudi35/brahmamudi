"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";

import { ShareProfile } from "@/components/admin/share-profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import type { ApiError } from "@/lib/types";

type Member = { id: number; regno: string; name: string; gender: string; status: string };

/** Admin tab: pick a member by profile number, then send their profile to
 * others or send others' profiles to them, without opening the member page. */
export function SendProfilesTab() {
  const [number, setNumber] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function find(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const m = await apiFetch<Member>(
        `/moderation/profiles/lookup/?number=${encodeURIComponent(number.trim())}`,
      );
      setMember(m);
    } catch (err) {
      setMember(null);
      setError((err as ApiError).detail ?? "Couldn't find that member.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={find} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="send-member">Member&apos;s profile number</Label>
              <Input
                id="send-member"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="6221"
                className="w-56"
                aria-invalid={!!error}
              />
            </div>
            <Button type="submit" disabled={busy || !number.trim()}>
              {busy ? <Spinner /> : <Search className="size-4" />}
              Find member
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

          {member && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{member.name || "Member"}</span>
              <span className="text-muted-foreground">
                {member.regno} · {member.gender === "F" ? "Bride" : "Groom"}
              </span>
              {member.status !== "active" && <Badge variant="destructive">{member.status}</Badge>}
              <Button
                size="sm"
                variant="ghost"
                render={<Link href={`/admin/members/${member.id}`} />}
              >
                <ExternalLink className="size-4" />
                Open member
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {member && (
        <div key={member.id} className="grid items-start gap-6 lg:grid-cols-2">
          <ShareProfile profileId={member.id} />
          <ShareProfile profileId={member.id} direction="suggest" />
        </div>
      )}
    </div>
  );
}
