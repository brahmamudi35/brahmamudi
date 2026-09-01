"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, MailWarning } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { TextField } from "@/components/form/fields";
import { Container } from "@/components/site/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/form";

const schema = z
  .object({
    current_password: z.string().min(1, "Enter your current password."),
    new_password: z
      .string()
      .min(8, "At least 8 characters.")
      .regex(/[^0-9]/, "Can't be all numbers."),
    confirm: z.string(),
  })
  .refine((v) => v.new_password === v.confirm, {
    message: "Passwords don't match.",
    path: ["confirm"],
  });
type Values = z.infer<typeof schema>;

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountInner />
    </Suspense>
  );
}

function AccountInner() {
  const { user, refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [digestSaving, setDigestSaving] = useState(false);

  useEffect(() => {
    const d = searchParams.get("digest");
    if (d === "off") toast.success("Unsubscribed from the weekly digest email.");
    else if (d === "invalid") toast.error("That unsubscribe link is no longer valid.");
  }, [searchParams]);

  async function setDigest(on: boolean) {
    setDigestSaving(true);
    try {
      await apiFetch("/auth/me/", { method: "PATCH", body: { email_digest: on } });
      await refreshUser();
      toast.success(on ? "Weekly digest on." : "Weekly digest off.");
    } catch (err) {
      handleApiError(err);
    } finally {
      setDigestSaving(false);
    }
  }
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: "", new_password: "", confirm: "" },
  });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    try {
      await apiFetch("/auth/password/change/", {
        method: "POST",
        body: {
          current_password: values.current_password,
          new_password: values.new_password,
        },
      });
      toast.success("Password changed.");
      form.reset();
    } catch (err) {
      handleApiError(err, form);
    } finally {
      setSubmitting(false);
    }
  }

  async function sendSetPassword() {
    if (!user) return;
    await apiFetch("/auth/password/reset/", {
      method: "POST",
      auth: false,
      body: { email: user.email },
    });
    setResetSent(true);
  }

  return (
    <Container className="max-w-xl py-8">
      <h1 className="font-heading text-2xl font-semibold">Account</h1>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Name" value={user?.full_name || "—"} />
          <Row
            label="Email"
            value={
              <span className="flex items-center gap-2">
                {user?.email}
                {user?.email_verified ? (
                  <Badge variant="outline" className="text-primary">
                    <BadgeCheck className="size-3" /> verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600">
                    <MailWarning className="size-3" /> unverified
                  </Badge>
                )}
              </span>
            }
          />
          <Row
            label="Google"
            value={user?.google_linked ? "Linked" : "Not linked"}
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Email preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={!!user?.email_digest}
              disabled={digestSaving}
              onCheckedChange={(v) => setDigest(v === true)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Weekly match digest</span>
              <span className="block text-muted-foreground">
                A weekly email with new matches, interests awaiting your reply, and
                who viewed your profile. Interest and verification emails are always
                sent.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">
            {user?.has_usable_password ? "Change password" : "Set a password"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user?.has_usable_password ? (
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
              <FieldGroup>
                <TextField
                  form={form}
                  name="current_password"
                  label="Current password"
                  type="password"
                  autoComplete="current-password"
                />
                <TextField
                  form={form}
                  name="new_password"
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                />
                <TextField
                  form={form}
                  name="confirm"
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                />
                <Button type="submit" disabled={submitting}>
                  {submitting && <Spinner />}
                  Update password
                </Button>
              </FieldGroup>
            </form>
          ) : resetSent ? (
            <p className="text-sm text-muted-foreground">
              We&apos;ve emailed you a link to set your password.
            </p>
          ) : (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                You sign in with Google. To add a password, we&apos;ll email you a
                secure link.
              </p>
              <Button variant="outline" onClick={sendSetPassword}>
                Email me a link
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-sm">
        <Link href="/dashboard" className="text-primary hover:underline">
          Back to dashboard
        </Link>
      </p>
    </Container>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
