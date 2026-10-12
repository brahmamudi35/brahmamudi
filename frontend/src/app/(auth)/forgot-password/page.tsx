"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  ResendCodeButton,
  otpInputProps,
} from "@/components/auth/resend-code-button";
import { TextField } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { handleApiError } from "@/lib/form";

const emailSchema = z.object({ email: z.string().email("Enter a valid email.") });
type EmailValues = z.infer<typeof emailSchema>;

const resetSchema = z
  .object({
    code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from the email."),
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
type ResetValues = z.infer<typeof resetSchema>;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="size-10 text-primary" />
          <CardTitle className="font-heading text-2xl">Password set</CardTitle>
          <CardDescription>Taking you to sign in…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return email ? (
    <CodeStep email={email} onBack={() => setEmail(null)} onDone={() => setDone(true)} />
  ) : (
    <EmailStep onSent={setEmail} />
  );
}

function EmailStep({ onSent }: { onSent: (email: string) => void }) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: EmailValues) {
    setSubmitting(true);
    try {
      await apiFetch("/auth/password/reset/", {
        method: "POST",
        auth: false,
        body: values,
      });
      onSent(values.email.trim().toLowerCase());
    } catch (err) {
      handleApiError(err, form);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Reset your password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a 6-digit code. Members migrated
          from the old site: use this to set your first password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <TextField
              form={form}
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
            />
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting && <Spinner />}
              Send code
            </Button>
          </FieldGroup>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function CodeStep({
  email,
  onBack,
  onDone,
}: {
  email: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: "", new_password: "", confirm: "" },
  });

  async function onSubmit(values: ResetValues) {
    setSubmitting(true);
    try {
      await apiFetch("/auth/password/reset/confirm/", {
        method: "POST",
        auth: false,
        body: { email, code: values.code, new_password: values.new_password },
      });
      onDone();
      setTimeout(() => router.replace("/login"), 2000);
    } catch (err) {
      handleApiError(err, form);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Enter your code</CardTitle>
        <CardDescription>
          If <span className="font-medium text-foreground">{email}</span> is
          registered, we&apos;ve emailed it a 6-digit code. It expires in 10
          minutes. Check your spam folder if you don&apos;t see it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <TextField
              form={form}
              name="code"
              label="6-digit code"
              required
              autoFocus
              {...otpInputProps}
            />
            <TextField
              form={form}
              name="new_password"
              label="New password"
              type="password"
              autoComplete="new-password"
              required
            />
            <TextField
              form={form}
              name="confirm"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              required
            />
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting && <Spinner />}
              Set password
            </Button>
          </FieldGroup>
        </form>
        <div className="mt-6 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:underline"
          >
            Use a different email
          </button>
          <ResendCodeButton path="/auth/password/reset/" email={email} />
        </div>
      </CardContent>
    </Card>
  );
}
