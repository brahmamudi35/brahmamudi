"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, MailCheck, XCircle } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
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
import { useAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/form";

const RESEND_PATH = "/auth/email/verify/resend/";

function VerifyEmail() {
  const params = useSearchParams();
  const token = params.get("token");
  const { user, loading } = useAuth();

  // Older emails carried a signed link; keep honouring those.
  if (token) return <VerifyByLink token={token} />;
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }
  if (user?.email_verified) return <Verified />;
  return (
    <VerifyByCode
      signedInEmail={user?.email ?? null}
      initialEmail={params.get("email") ?? ""}
      justSent={params.get("sent") === "1"}
    />
  );
}

function Verified() {
  const { user } = useAuth();
  const next = !user ? "/login" : user.has_profile ? "/dashboard" : "/onboarding";
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <CheckCircle2 className="size-10 text-primary" />
        <CardTitle className="font-heading text-2xl"><h1>Email verified</h1></CardTitle>
        <CardDescription>Your email address is confirmed. You&apos;re all set.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" render={<Link href={next} />}>
          {!user ? "Sign in" : user.has_profile ? "Go to dashboard" : "Set up your profile"}
        </Button>
      </CardContent>
    </Card>
  );
}

const codeSchema = z.object({
  email: z.string().email("Enter a valid email."),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from the email."),
});
type CodeValues = z.infer<typeof codeSchema>;

function VerifyByCode({
  signedInEmail,
  initialEmail,
  justSent,
}: {
  signedInEmail: string | null;
  initialEmail: string;
  justSent: boolean;
}) {
  const { refreshUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [verified, setVerified] = useState(false);
  const form = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { email: signedInEmail ?? initialEmail, code: "" },
  });
  const email = useWatch({ control: form.control, name: "email" });

  async function onSubmit(values: CodeValues) {
    setSubmitting(true);
    try {
      await apiFetch("/auth/email/verify/", {
        method: "POST",
        auth: false,
        body: values,
      });
      await refreshUser();
      setVerified(true);
    } catch (err) {
      handleApiError(err, form);
    } finally {
      setSubmitting(false);
    }
  }

  if (verified) return <Verified />;

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <MailCheck className="size-10 text-primary" />
        <CardTitle className="font-heading text-2xl"><h1>Verify your email</h1></CardTitle>
        <CardDescription>
          {signedInEmail ? (
            <>
              We&apos;ve sent a 6-digit code to{" "}
              <span className="font-medium text-foreground">{signedInEmail}</span>.
            </>
          ) : (
            "Enter the 6-digit code we emailed you."
          )}{" "}
          It expires in 10 minutes. Check your spam folder if you don&apos;t see it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            {!signedInEmail && (
              <TextField
                form={form}
                name="email"
                label="Email"
                type="email"
                autoComplete="email"
                required
              />
            )}
            <TextField
              form={form}
              name="code"
              label="6-digit code"
              required
              autoFocus
              {...otpInputProps}
            />
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting && <Spinner />}
              Verify
            </Button>
          </FieldGroup>
        </form>
        <div className="mt-6 flex items-center justify-between text-sm">
          {signedInEmail ? (
            <Link href="/dashboard" className="text-muted-foreground hover:underline">
              Do this later
            </Link>
          ) : (
            <Link href="/login" className="text-muted-foreground hover:underline">
              Back to sign in
            </Link>
          )}
          <ResendCodeButton
            path={RESEND_PATH}
            email={email}
            initialCooldown={justSent ? 60 : 0}
          />
        </div>
      </CardContent>
    </Card>
  );
}

type LinkState = "verifying" | "ok" | "error";

function VerifyByLink({ token }: { token: string }) {
  const { refreshUser } = useAuth();
  const [state, setState] = useState<LinkState>("verifying");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    apiFetch<{ detail: string }>("/auth/email/verify/", {
      method: "POST",
      auth: false,
      body: { token },
    })
      .then(async () => {
        await refreshUser();
        setState("ok");
      })
      .catch((e: { detail?: string }) => {
        setState("error");
        setMessage(e?.detail ?? "This verification link is invalid or expired.");
      });
  }, [token, refreshUser]);

  if (state === "ok") return <Verified />;

  return (
    <Card>
      <CardHeader className="items-center text-center">
        {state === "verifying" ? (
          <Spinner className="size-8 text-primary" />
        ) : (
          <XCircle className="size-10 text-destructive" />
        )}
        <CardTitle className="font-heading text-2xl"><h1>
          {state === "verifying" ? "Verifying your email…" : "Couldn't verify"}
        </h1></CardTitle>
        {state === "error" && <CardDescription>{message}</CardDescription>}
      </CardHeader>
      {state === "error" && (
        <CardContent>
          <Button className="w-full" render={<Link href="/verify-email" />}>
            Verify with a code instead
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}
