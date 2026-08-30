"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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

const schema = z
  .object({
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

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { new_password: "", confirm: "" },
  });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    try {
      await apiFetch("/auth/password/reset/confirm/", {
        method: "POST",
        auth: false,
        body: { uid, token, new_password: values.new_password },
      });
      setDone(true);
      setTimeout(() => router.replace("/login"), 2000);
    } catch (err) {
      handleApiError(err, form);
    } finally {
      setSubmitting(false);
    }
  }

  if (!uid || !token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Invalid link</CardTitle>
          <CardDescription>
            This password reset link is incomplete. Request a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" render={<Link href="/forgot-password" />}>
            Request a new link
          </Button>
        </CardContent>
      </Card>
    );
  }

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl">
          Choose a new password
        </CardTitle>
        <CardDescription>Pick something you&apos;ll remember.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
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
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
