"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowLeft, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  MemberFormSections,
  toMemberBody,
  toMemberValues,
  type MemberValues,
} from "@/components/admin/member-form";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/form";
import { useReferenceData } from "@/lib/reference";
import type { ModerationProfileDetail } from "@/lib/types";

export default function AdminNewMemberPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { data: ref } = useReferenceData();
  const form = useForm<MemberValues>({ defaultValues: toMemberValues() });

  if (loading || !user) return null;
  if (!user.is_staff)
    return (
      <Container className="py-16 text-center text-sm text-muted-foreground">
        Staff only.
      </Container>
    );

  async function create(values: MemberValues) {
    let ok = true;
    if (!values.first_name.trim()) {
      form.setError("first_name", { message: "Enter a name." });
      ok = false;
    }
    if (!values.gender) {
      form.setError("gender", { message: "Select one." });
      ok = false;
    }
    if (!ok) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    try {
      const created = await apiFetch<ModerationProfileDetail>("/moderation/profiles/", {
        method: "POST",
        body: { ...toMemberBody(values), regno: undefined }, // always automatic
      });
      toast.success(`Member ${created.regno} created.`);
      router.push(`/admin/members/${created.id}`);
    } catch (err) {
      handleApiError(err, form);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const saving = form.formState.isSubmitting;

  return (
    <Container className="max-w-3xl py-6">
      <Button variant="ghost" size="sm" className="mb-4" render={<Link href="/admin" />}>
        <ArrowLeft className="size-4" />
        Admin
      </Button>
      <h1 className="font-heading text-2xl font-semibold">Add member</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Register a member on their behalf. Only name and gender are required — fill in
        what you have and add the rest later. The member sets their own password with
        &ldquo;Forgot password&rdquo; using the login email.
      </p>

      <Card className="mt-6">
        <CardContent className="pt-6">
          {!ref ? (
            <div className="flex justify-center py-10">
              <Spinner className="size-6 text-primary" />
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(create)} noValidate>
              <MemberFormSections form={form} refData={ref} isNew />
              <div className="sticky bottom-0 -mx-6 mt-8 flex justify-end gap-2 border-t bg-card/95 px-6 py-3 backdrop-blur">
                <Button type="button" variant="ghost" render={<Link href="/admin" />}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Spinner /> : <UserPlus className="size-4" />}
                  Create member
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
