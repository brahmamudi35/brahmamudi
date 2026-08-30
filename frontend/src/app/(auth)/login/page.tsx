"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";
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
import { useAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/form";

const schema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});
type Values = z.infer<typeof schema>;

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      router.replace(next);
    } catch (err) {
      handleApiError(err, form);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to continue your search.</CardDescription>
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
            <TextField
              form={form}
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              required
            />
            <div className="flex items-center justify-between text-sm">
              <Link
                href="/forgot-password"
                className="text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting && <Spinner />}
              Sign in
            </Button>
          </FieldGroup>
        </form>
        <GoogleAuthButton text="signin_with" />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Create a free profile
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
