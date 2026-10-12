"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { handleApiError } from "@/lib/form";

const COOLDOWN_SECONDS = 60;

/** "Resend code" link-button that POSTs {email} and then waits out the
 *  server's resend cooldown before it can be pressed again. */
export function ResendCodeButton({
  path,
  email,
  initialCooldown = COOLDOWN_SECONDS,
}: {
  path: string;
  email: string;
  initialCooldown?: number;
}) {
  const [left, setLeft] = useState(initialCooldown);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  async function resend() {
    setBusy(true);
    try {
      await apiFetch(path, { method: "POST", auth: false, body: { email } });
      toast.success("A new code is on its way.");
      setLeft(COOLDOWN_SECONDS);
    } catch (err) {
      handleApiError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      className="h-auto p-0"
      disabled={busy || left > 0 || !email}
      onClick={resend}
    >
      {busy && <Spinner />}
      {left > 0 ? `Resend code in ${left}s` : "Resend code"}
    </Button>
  );
}

/** Props for a 6-digit numeric one-time-code input (spread onto TextField). */
export const otpInputProps = {
  inputMode: "numeric",
  autoComplete: "one-time-code",
  maxLength: 6,
  placeholder: "••••••",
  className: "h-12 text-center font-mono text-2xl tracking-[0.5em]",
} as const;
