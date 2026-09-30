"use client";

import { useCallback, useEffect, useState } from "react";
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

import { PaymentsTable } from "@/components/admin/payments-table";
import { SelectField, TextField, TextareaField } from "@/components/form/fields";
import { Container } from "@/components/site/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/form";
import { useReferenceData } from "@/lib/reference";
import type {
  MembershipPlan,
  ModerationProfileDetail,
  ModerationSubscription,
} from "@/lib/types";

// Built from whole inches (not fixed cm steps) so every option has a
// distinct feet/inches label with no duplicates or rounding drift.
const heightOptions = Array.from({ length: 29 }, (_, i) => {
  const totalInch = 54 + i; // 4'6" to 6'10"
  const cm = Math.round(totalInch * 2.54);
  return {
    value: String(cm),
    label: `${Math.floor(totalInch / 12)}′ ${totalInch % 12}″ (${cm} cm)`,
  };
});

const str = (v: unknown) => (v == null ? "" : String(v));

type Values = Record<string, string>;

const FIELDS = [
  "first_name", "surname", "gender", "date_of_birth", "marital_status", "mother_tongue",
  "height_cm", "complexion", "food_habit",
  "subcaste", "gothram",
  "education_detail", "occupation", "company", "designation", "work_location", "annual_income_text",
  "country_living", "native_district", "region", "address",
  "father_name", "father_occupation", "mother_name", "mother_occupation", "family_background",
  "about", "expectations",
  "contact_phone", "parent_phone", "contact_notes",
] as const;

export default function AdminMemberPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const { data: ref } = useReferenceData();
  const [p, setP] = useState<ModerationProfileDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);

  const form = useForm<Values>();

  const hydrate = useCallback(
    (data: ModerationProfileDetail) => {
      setP(data);
      const rec = data as unknown as Record<string, unknown>;
      const v: Values = { email: data.email, phone: data.phone };
      for (const f of FIELDS) v[f] = str(rec[f]);
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

  async function save(values: Values) {
    setBusy("save");
    try {
      const body = {
        user: {
          email: values.email,
          phone: values.phone,
        },
        first_name: values.first_name,
        surname: values.surname,
        gender: values.gender,
        date_of_birth: values.date_of_birth || null,
        marital_status: values.marital_status,
        mother_tongue: values.mother_tongue,
        height_cm: values.height_cm ? Number(values.height_cm) : null,
        complexion: values.complexion,
        food_habit: values.food_habit,
        subcaste: values.subcaste,
        gothram: values.gothram,
        education_detail: values.education_detail,
        occupation: values.occupation,
        company: values.company,
        designation: values.designation,
        work_location: values.work_location,
        annual_income_text: values.annual_income_text,
        country_living: values.country_living,
        native_district: values.native_district,
        region: values.region,
        address: values.address,
        father_name: values.father_name,
        father_occupation: values.father_occupation,
        mother_name: values.mother_name,
        mother_occupation: values.mother_occupation,
        family_background: values.family_background,
        about: values.about,
        expectations: values.expectations,
        contact_phone: values.contact_phone,
        parent_phone: values.parent_phone,
        contact_notes: values.contact_notes,
      };
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

  const enums = ref?.enums;

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
            {p.regno} · {p.gender === "F" ? "Bride" : "Groom"}
            {p.age ? `, ${p.age}y` : ""} · joined{" "}
            {new Date(p.date_joined).toLocaleDateString()}
            {p.last_login
              ? ` · last seen ${new Date(p.last_login).toLocaleDateString()}`
              : " · never signed in"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant={p.is_verified ? "outline" : "default"}
            disabled={!!busy}
            onClick={() => act(p.is_verified ? "unverify" : "verify")}
          >
            {p.is_verified ? <X className="size-4" /> : <Check className="size-4" />}
            {p.is_verified ? "Unverify" : "Verify"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!!busy}
            onClick={() => act(p.status === "suspended" ? "reinstate" : "suspend")}
          >
            {p.status === "suspended" ? (
              <RotateCcw className="size-4" />
            ) : (
              <Ban className="size-4" />
            )}
            {p.status === "suspended" ? "Reinstate" : "Suspend"}
          </Button>
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
                <FieldGroup>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField form={form} name="email" label="Login email" type="email" />
                    <TextField form={form} name="phone" label="Account phone" />
                    <TextField form={form} name="first_name" label="Name" />
                    <TextField form={form} name="surname" label="Surname" />
                    {enums && (
                      <SelectField form={form} name="gender" label="Gender" options={enums.gender} />
                    )}
                    <TextField form={form} name="date_of_birth" label="Date of birth" type="date" />
                    {enums && (
                      <SelectField
                        form={form}
                        name="marital_status"
                        label="Marital status"
                        options={enums.marital_status}
                      />
                    )}
                    <TextField form={form} name="mother_tongue" label="Mother tongue" />
                    <SelectField form={form} name="height_cm" label="Height" options={heightOptions} />
                    {enums && (
                      <SelectField
                        form={form}
                        name="complexion"
                        label="Complexion"
                        options={enums.complexion}
                      />
                    )}
                    {enums && (
                      <SelectField
                        form={form}
                        name="food_habit"
                        label="Food habits"
                        options={enums.food_habit}
                      />
                    )}
                    {enums && (
                      <SelectField
                        form={form}
                        name="subcaste"
                        label="Sub-caste"
                        options={enums.subcaste}
                      />
                    )}
                    <TextField form={form} name="gothram" label="Gothram" />
                    <TextField form={form} name="occupation" label="Occupation" />
                    <TextField form={form} name="company" label="Company" />
                    <TextField form={form} name="designation" label="Designation" />
                    <TextField form={form} name="work_location" label="Work location" />
                    <TextField form={form} name="annual_income_text" label="Annual income" />
                    <TextField form={form} name="country_living" label="Living in (country)" />
                    <TextField form={form} name="native_district" label="Native district" />
                    {enums && (
                      <SelectField form={form} name="region" label="Region" options={enums.region} />
                    )}
                    <TextField form={form} name="father_name" label="Father's name" />
                    <TextField form={form} name="father_occupation" label="Father's occupation" />
                    <TextField form={form} name="mother_name" label="Mother's name" />
                    <TextField form={form} name="mother_occupation" label="Mother's occupation" />
                    <TextField form={form} name="contact_phone" label="Contact mobile" />
                    <TextField form={form} name="parent_phone" label="Parent's mobile" />
                  </div>
                  <TextField form={form} name="education_detail" label="Education detail" />
                  <TextareaField form={form} name="address" label="Address" rows={2} />
                  <TextareaField form={form} name="family_background" label="Family background" rows={3} />
                  <TextareaField form={form} name="about" label="About" rows={3} />
                  <TextareaField form={form} name="expectations" label="Partner expectations" rows={3} />
                  <TextareaField form={form} name="contact_notes" label="Contact notes (staff)" rows={2} />
                </FieldGroup>
                <div className="mt-6 flex justify-end">
                  <Button type="submit" disabled={busy === "save"}>
                    {busy === "save" && <Spinner />}
                    Save changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-3 font-heading text-lg font-semibold">Payments</h2>
              <PaymentsTable profileId={p.id} />
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
                        <img src={ph.image} alt="" className="size-full object-cover" />
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
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 flex-1 px-0"
                          disabled={!!busy}
                          onClick={async () => {
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
                        </Button>
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
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!!busy}
                      onClick={async () => {
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
                    </Button>
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

function PlanManager({
  profileId,
  subscriptions,
  plans,
  onChange,
}: {
  profileId: number;
  subscriptions: ModerationSubscription[];
  plans: MembershipPlan[];
  onChange: () => void;
}) {
  const [slug, setSlug] = useState("");
  const [months, setMonths] = useState("");
  const [busy, setBusy] = useState(false);

  async function grant() {
    if (!slug) return;
    setBusy(true);
    try {
      await apiFetch(`/moderation/profiles/${profileId}/grant-plan/`, {
        method: "POST",
        body: { plan: slug, months: months ? Number(months) : undefined },
      });
      toast.success("Plan granted.");
      setSlug("");
      setMonths("");
      onChange();
    } catch (err) {
      handleApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: number) {
    setBusy(true);
    try {
      await apiFetch(`/moderation/subscriptions/${id}/revoke/`, { method: "POST" });
      toast.success("Subscription revoked.");
      onChange();
    } catch (err) {
      handleApiError(err);
    } finally {
      setBusy(false);
    }
  }

  const fieldCls =
    "h-8 rounded-md border bg-background px-2 text-sm outline-none focus-visible:border-ring";

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <h2 className="font-heading text-lg font-semibold">Membership</h2>

        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subscriptions on record.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {subscriptions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5"
              >
                <span>
                  <span className="font-medium">{s.plan}</span>{" "}
                  <Badge
                    variant={s.is_current ? "default" : "outline"}
                    className="ml-1 align-middle"
                  >
                    {s.status}
                  </Badge>
                  <span className="block text-xs text-muted-foreground">
                    {s.started_on || "—"} → {s.expires_on || "no expiry"}
                    {s.is_legacy ? " · legacy" : ""}
                  </span>
                </span>
                {s.is_current && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => revoke(s.id)}
                  >
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 rounded-lg border bg-muted/20 p-2">
          <p className="text-xs font-medium text-muted-foreground">Grant / comp a plan</p>
          <div className="flex gap-2">
            <select
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={`${fieldCls} flex-1`}
            >
              <option value="">Choose plan…</option>
              {plans.map((pl) => (
                <option key={pl.slug} value={pl.slug}>
                  {pl.name} (₹{Number(pl.price_inr).toLocaleString("en-IN")})
                </option>
              ))}
            </select>
            <input
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              inputMode="numeric"
              placeholder="Months"
              className={`${fieldCls} w-20`}
            />
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={busy || !slug}
            onClick={grant}
          >
            {busy && <Spinner />}
            Grant plan
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Leave months blank to use the plan&apos;s own duration. Supersedes the
            current active subscription.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
