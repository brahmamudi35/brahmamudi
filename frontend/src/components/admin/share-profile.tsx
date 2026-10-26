"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import type { ApiError } from "@/lib/types";

type Brief = { id: number; regno: string; name: string };
export type ShareResult = {
  sent: Brief[];
  not_found: string[];
  skipped: (Brief & { number: string; reason: string })[];
};

const who = (b: Brief) => `${b.name || "Member"} (${b.regno})`;

/** Staff: send this member's profile to a typed list of other members. */
export function ShareProfile({ profileId, onSent }: { profileId: number; onSent?: () => void }) {
  const [numbers, setNumbers] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ShareResult | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await apiFetch<ShareResult>(`/moderation/profiles/${profileId}/share/`, {
        method: "POST",
        body: { numbers },
      });
      setResult(res);
      if (res.sent.length) {
        toast.success(`Profile sent to ${res.sent.length} member${res.sent.length > 1 ? "s" : ""}.`);
        setNumbers("");
        onSent?.();
      }
    } catch (err) {
      setError((err as ApiError).detail ?? "Couldn't send the profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="mb-1 font-heading text-lg font-semibold">Send this profile to members</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          They get a notification on the site and an email with a link to this profile.
        </p>
        <form onSubmit={send} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="share-numbers">Profile numbers</Label>
            <Textarea
              id="share-numbers"
              rows={3}
              value={numbers}
              onChange={(e) => setNumbers(e.target.value)}
              placeholder="6221, 6222, 6185"
              aria-invalid={!!error}
            />
            <p className="text-sm text-muted-foreground">
              Separate with commas, spaces or new lines. Old-site numbers work by their
              first number (6185 for 6185-17-S-VIP). Up to 100 at a time.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={busy || !numbers.trim()}>
              {busy ? <Spinner /> : <Send className="size-4" />}
              Send profile
            </Button>
          </div>
        </form>

        {result && (
          <div className="mt-4 space-y-2 text-sm" aria-live="polite">
            {result.sent.length > 0 && (
              <p>
                <span className="font-medium text-primary">Sent to {result.sent.length}:</span>{" "}
                {result.sent.map(who).join(", ")}
              </p>
            )}
            {result.not_found.length > 0 && (
              <p>
                <span className="font-medium text-destructive">Not found:</span>{" "}
                {result.not_found.join(", ")}
              </p>
            )}
            {result.skipped.length > 0 && (
              <div>
                <span className="font-medium">Skipped:</span>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {result.skipped.map((s) => (
                    <li key={s.id}>
                      {who(s)}: {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
