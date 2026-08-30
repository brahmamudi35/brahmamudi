"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { handleApiError } from "@/lib/form";
import type { InterestQuota, InterestTemplate } from "@/lib/types";

export function SendInterestDialog({
  profileId,
  name,
  onSent,
}: {
  profileId: number;
  name: string;
  onSent?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<InterestTemplate[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [quota, setQuota] = useState<InterestQuota | null>(null);

  useEffect(() => {
    if (!open || templates.length) return;
    apiFetch<InterestTemplate[]>("/interest-templates/", { auth: false })
      .then((t) => {
        setTemplates(t);
        if (t[0]) setTemplateId(String(t[0].id));
      })
      .catch(() => {});
  }, [open, templates.length]);

  useEffect(() => {
    if (!open) return;
    apiFetch<InterestQuota>("/interests/quota/")
      .then(setQuota)
      .catch(() => {});
  }, [open]);

  const outOfQuota = quota != null && quota.remaining != null && quota.remaining <= 0;

  async function send() {
    setSending(true);
    try {
      await apiFetch("/interests/", {
        method: "POST",
        body: {
          receiver: profileId,
          template: templateId ? Number(templateId) : null,
          message,
        },
      });
      toast.success(`Interest sent to ${name}.`);
      setOpen(false);
      onSent?.();
    } catch (err) {
      handleApiError(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Heart className="size-4" />
        Express interest
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">Express interest in {name}</DialogTitle>
          <DialogDescription>
            Choose a message. They&apos;ll be notified and can accept or decline.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={templateId} onValueChange={setTemplateId} className="gap-2">
          {templates.map((t) => (
            <label
              key={t.id}
              className="flex cursor-pointer gap-3 rounded-lg border p-3 text-sm has-data-checked:border-primary/40 has-data-checked:bg-primary/5"
            >
              <RadioGroupItem value={String(t.id)} className="mt-0.5" />
              <span className="text-muted-foreground">{t.text}</span>
            </label>
          ))}
        </RadioGroup>

        <Textarea
          placeholder="Add a personal note (optional)"
          value={message}
          maxLength={255}
          onChange={(e) => setMessage(e.target.value)}
        />

        {quota && !quota.unlimited && (
          <p className="text-xs text-muted-foreground">
            {outOfQuota
              ? "You've reached today's interest limit. Upgrade your membership to send more."
              : `${quota.remaining} of ${quota.limit} interests left today.`}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={send} disabled={sending || !templateId || outOfQuota}>
            {sending && <Spinner />}
            Send interest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
