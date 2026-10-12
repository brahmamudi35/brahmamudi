"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isApiError } from "@/lib/form";

/** "Danger zone": a member permanently deletes their own account. Confirms
 *  with the password, or by typing DELETE when the account has none. */
export function DeleteAccountCard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user || user.is_staff) return null;
  const hasPassword = user.has_usable_password;

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/auth/delete-account/", {
        method: "POST",
        body: hasPassword ? { password: secret } : { confirm: secret },
      });
      logout();
      toast.success("Your account has been deleted.");
      router.replace("/");
    } catch (err) {
      if (isApiError(err)) {
        const f = err.fields ?? {};
        setError((f.password ?? f.confirm ?? f.non_field_errors ?? [err.detail]).join(" "));
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-6 border-destructive/40">
      <CardHeader>
        <CardTitle className="text-lg text-destructive">Delete account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Permanently delete your account, profile, photos and horoscope. Interests,
          shortlists and any remaining membership are lost. This cannot be undone.
          Payment records are kept for accounting, as described in our privacy policy.
        </p>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Delete my account
        </Button>
      </CardContent>

      <AlertDialog
        open={open}
        onOpenChange={(o) => {
          if (busy) return;
          setOpen(o);
          setSecret("");
          setError(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              {hasPassword
                ? "Enter your password to confirm."
                : "Type DELETE to confirm."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            aria-label={hasPassword ? "Password" : "Type DELETE"}
            type={hasPassword ? "password" : "text"}
            autoComplete={hasPassword ? "current-password" : "off"}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder={hasPassword ? "Password" : "DELETE"}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={busy || !secret} onClick={remove}>
              {busy && <Spinner />}
              Delete forever
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
