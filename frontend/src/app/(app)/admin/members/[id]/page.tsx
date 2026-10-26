"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Check,
  ExternalLink,
  FileText,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { ActivityLog } from "@/components/admin/activity-log";
import { PaymentsTable } from "@/components/admin/payments-table";
import { PlanManager } from "@/components/admin/plan-manager";
import { ShareProfile } from "@/components/admin/share-profile";
import {
  MemberFormSections,
  toMemberBody,
  toMemberValues,
  type MemberValues,
} from "@/components/admin/member-form";
import { Container } from "@/components/site/container";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/form";
import { useReferenceData } from "@/lib/reference";
import type {
  MembershipPlan,
  ModerationProfileDetail,
} from "@/lib/types";

export default function AdminMemberPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const { data: ref } = useReferenceData();
  const [p, setP] = useState<ModerationProfileDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [shares, setShares] = useState(0);
  // re-read the activity log after a save or a send, without reloading the form
  const activityKey = useMemo(() => ({ p, shares }), [p, shares]);

  const form = useForm<MemberValues>();

  const hydrate = useCallback(
    (data: ModerationProfileDetail) => {
      setP(data);
      const v = toMemberValues(data as unknown as Record<string, unknown>);
      form.reset(v);
    },
    [form],
  );

  const load = useCallback(() => {
    apiFetch<ModerationProfileDetail>(`/moderation/profiles/${id}/`)
      .then(hydrate)
      .catch(() => setNotFound(true));
  }, [id, hydrate]);

  useEffect(load, [load]);
  useEffect(() => {
    apiFetch<MembershipPlan[]>("/membership-plans/", { auth: false })
      .then((d) => setPlans(d.filter((x) => Number(x.price_inr) > 0)))
      .catch(() => {});
  }, []);

  if (loading || !user) return null;
  if (!user.is_staff)
    return (
      <Container className="py-16 text-center text-sm text-muted-foreground">
        Staff only.
      </Container>
    );
  if (notFound)
    return (
      <Container className="py-16 text-center">
        <p className="text-muted-foreground">Member not found.</p>
        <Button variant="outline" className="mt-4" render={<Link href="/admin" />}>
          Back to Admin
        </Button>
      </Container>
    );
  if (!p)
    return (
      <Container className="flex justify-center py-16">
        <Spinner className="size-6 text-primary" />
      </Container>
    );

  async function act(action: string) {
    setBusy(action);
    try {
      await apiFetch(`/moderation/profiles/${id}/${action}/`, { method: "POST" });
      load();
      toast.success("Done.");
    } catch (err) {
      handleApiError(err);
    } finally {
      setBusy(null);
    }
  }

  async function save(values: MemberValues) {
    setBusy("save");
    try {
      const body = toMemberBody(values);
      const updated = await apiFetch<ModerationProfileDetail>(
        `/moderation/profiles/${id}/`,
        { method: "PATCH", body },
      );
      hydrate(updated);
      toast.success("Member profile saved.");
    } catch (err) {
      handleApiError(err, form);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Container className="py-6">
      <Button variant="ghost" size="sm" className="mb-4" render={<Link href="/admin" />}>
        <ArrowLeft className="size-4" />
        Admin
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold">
              {p.full_name || p.regno}
            </h1>
            {p.is_verified && <BadgeCheck className="size-5 text-primary" />}
            {p.status === "suspended" && <Badge variant="destructive">Suspended</Badge>}
            {p.plan !== "Free" && <Badge variant="secondary">{p.plan}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {p.regno}
            {p.brahmamudi_no ? ` · Brahmamudi no. ${p.brahmamudi_no}` : ""} ·{" "}
            {p.gender === "F" ? "Bride" : "Groom"}
            {p.age ? `, ${p.age}y` : ""} · joined{" "}
            {new Date(p.date_joined).toLocaleDateString()}
            {p.last_login
              ? ` · last seen ${new Date(p.last_login).toLocaleDateString()}`
              : " · never signed in"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {p.is_verified ? (
            <ConfirmButton
              size="sm"
              variant="outline"
              disabled={!!busy}
              title="Remove the verified badge?"
              description={`${p.full_name || p.regno} will no longer show as verified to other members.`}
              confirmLabel="Unverify"
              onConfirm={() => act("unverify")}
            >
              <X className="size-4" />
              Unverify
            </ConfirmButton>
          ) : (
            <Button size="sm" disabled={!!busy} onClick={() => act("verify")}>
              <Check className="size-4" />
              Verify
            </Button>
          )}
          {p.status === "suspended" ? (
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act("reinstate")}>
              <RotateCcw className="size-4" />
              Reinstate
            </Button>
          ) : (
            <ConfirmButton
              size="sm"
              variant="outline"
              disabled={!!busy}
              title="Suspend this member?"
              description={`${p.full_name || p.regno}'s profile will be hidden from search and matches until you reinstate it.`}
              confirmLabel="Suspend"
              onConfirm={() => act("suspend")}
            >
              <Ban className="size-4" />
              Suspend
            </ConfirmButton>
          )}
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/profiles/${p.id}`} target="_blank" />}
          >
            <ExternalLink className="size-4" />
            Public
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Profile" value={`${p.completeness}%`} />
        <Stat label="Email" value={p.email_verified ? "verified" : "unverified"} />
        <Stat label="Interests in" value={p.activity.interests_received} />
        <Stat label="Interests out" value={p.activity.interests_sent} />
        <Stat label="Visitors" value={p.activity.profile_views_received} />
        <Stat label="Shortlisted by" value={p.activity.shortlisted_by} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-4 font-heading text-lg font-semibold">Edit member</h2>
              <form onSubmit={form.handleSubmit(save)}>
                {ref && <MemberFormSections form={form} refData={ref} />}
                <div className="mt-6 flex justify-end">
                  <Button type="submit" disabled={busy === "save"}>
                    {busy === "save" && <Spinner />}
                    Save changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <ShareProfile profileId={p.id} onSent={() => setShares((n) => n + 1)} />

          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-3 font-heading text-lg font-semibold">Payments</h2>
              <PaymentsTable
                key={p.subscriptions.map((s) => s.id).join(",")}
                profileId={p.id}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-3 font-heading text-lg font-semibold">Activity</h2>
              <ActivityLog profileId={p.id} refreshKey={activityKey} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <PlanManager
            profileId={p.id}
            subscriptions={p.subscriptions}
            plans={plans}
            onChange={load}
          />

          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-3 font-heading text-lg font-semibold">
                Photos ({p.photos.length})
              </h2>
              {p.photos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No photos.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {p.photos.map((ph) => (
                    <div key={ph.id} className="space-y-1">
                      <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ph.image} alt="" className="size-full object-contain" />
                        {!ph.is_approved && (
                          <span className="absolute left-1 top-1 rounded bg-amber-500/90 px-1 text-[10px] font-medium text-white">
                            pending
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {!ph.is_approved && (
                          <Button
                            size="sm"
                            className="h-6 flex-1 px-0"
                            disabled={!!busy}
                            aria-label="Approve photo"
                            onClick={async () => {
                              setBusy(`photo-${ph.id}`);
                              try {
                                await apiFetch(`/moderation/photos/${ph.id}/approve/`, {
                                  method: "POST",
                                });
                                load();
                              } catch (e) {
                                handleApiError(e);
                              } finally {
                                setBusy(null);
                              }
                            }}
                          >
                            <Check className="size-3" />
                          </Button>
                        )}
                        <ConfirmButton
                          size="sm"
                          variant="outline"
                          className="h-6 flex-1 px-0"
                          disabled={!!busy}
                          aria-label="Delete photo"
                          title="Delete this photo?"
                          description="The photo is removed permanently. The member can upload it again."
                          confirmLabel="Delete photo"
                          onConfirm={async () => {
                            setBusy(`photo-${ph.id}`);
                            try {
                              await apiFetch(`/moderation/photos/${ph.id}/`, {
                                method: "DELETE",
                              });
                              load();
                            } catch (e) {
                              handleApiError(e);
                            } finally {
                              setBusy(null);
                            }
                          }}
                        >
                          <Trash2 className="size-3" />
                        </ConfirmButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-3 font-heading text-lg font-semibold">Horoscope</h2>
              {!p.horoscope ? (
                <p className="text-sm text-muted-foreground">Not uploaded.</p>
              ) : (
                <div className="space-y-2 text-sm">
                  <a
                    href={p.horoscope.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <FileText className="size-4" />
                    View {p.horoscope.is_pdf ? "PDF" : "image"}
                    {!p.horoscope.is_approved && (
                      <Badge variant="outline">pending</Badge>
                    )}
                  </a>
                  <div className="flex gap-1.5">
                    {!p.horoscope.is_approved && (
                      <Button
                        size="sm"
                        disabled={!!busy}
                        onClick={async () => {
                          setBusy("horo");
                          try {
                            await apiFetch(
                              `/moderation/horoscopes/${p.horoscope!.id}/approve/`,
                              { method: "POST" },
                            );
                            load();
                          } catch (e) {
                            handleApiError(e);
                          } finally {
                            setBusy(null);
                          }
                        }}
                      >
                        <Check className="size-4" /> Approve
                      </Button>
                    )}
                    <ConfirmButton
                      size="sm"
                      variant="outline"
                      disabled={!!busy}
                      title="Remove this horoscope?"
                      description="The uploaded horoscope document is deleted permanently. The member can upload a new one."
                      confirmLabel="Remove"
                      onConfirm={async () => {
                        setBusy("horo");
                        try {
                          await apiFetch(
                            `/moderation/horoscopes/${p.horoscope!.id}/`,
                            { method: "DELETE" },
                          );
                          load();
                        } catch (e) {
                          handleApiError(e);
                        } finally {
                          setBusy(null);
                        }
                      }}
                    >
                      <Trash2 className="size-4" /> Remove
                    </ConfirmButton>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="py-3">
        <p className="text-lg font-semibold capitalize">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
