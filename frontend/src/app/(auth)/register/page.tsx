"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
  full_name: z.string().min(2, "Tell us your name."),
  email: z.string().email("Enter a valid email."),
  password: z
    .string()
    .min(8, "At least 8 characters.")
    .regex(/[^0-9]/, "Can't be all numbers."),
});
type Values = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register, login } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", email: "", password: "" },
  });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    try {
      await register(values);
      await login(values.email, values.password);
      toast.success("Account created. Check your email for a 6-digit code.");
      router.replace("/verify-email?sent=1");
    } catch (err) {
      handleApiError(err, form);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl">
          Create your free profile
        </CardTitle>
        <CardDescription>
          Registration is free. You&apos;ll add bio-data and photos next.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <TextField
              form={form}
              name="full_name"
              label="Your name"
              autoComplete="name"
              required
            />
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
              autoComplete="new-password"
              description="At least 8 characters."
              required
            />
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting && <Spinner />}
              Create account
            </Button>
          </FieldGroup>
        </form>
        <GoogleAuthButton text="signup_with" />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
