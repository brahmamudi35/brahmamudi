"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { SelectField, TextField, TextareaField } from "@/components/form/fields";
import { PhotoManager } from "@/components/onboarding/photo-manager";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/form";
import { toChoices, useReferenceData } from "@/lib/reference";
import type { Profile } from "@/lib/types";

const schema = z.object({
  profile_for: z.string().min(1),
  first_name: z.string().min(2, "Enter a name."),
  surname: z.string().optional(),
  gender: z.string().min(1, "Select one."),
  date_of_birth: z.string().min(1, "Required."),
  marital_status: z.string().min(1, "Select one."),
  about: z.string().max(2000, "Keep it under 2000 characters.").optional(),

  height_cm: z.string().optional(),
  complexion: z.string().optional(),
  food_habit: z.string().optional(),

  subcaste: z.string().min(1, "Select one."),
  gothram: z.string().optional(),
  nakshatram: z.string().optional(),
  raasi: z.string().optional(),
  paadam: z.string().optional(),
  time_of_birth: z.string().optional(),
  place_of_birth: z.string().optional(),

  education: z.string().optional(),
  education_detail: z.string().optional(),
  occupation: z.string().optional(),
  company: z.string().optional(),
  work_location: z.string().optional(),
  annual_income_text: z.string().optional(),

  country_living: z.string().optional(),
  native_district: z.string().optional(),
  settled_at: z.string().optional(),
  region: z.string().optional(),
  address: z.string().optional(),

  father_name: z.string().optional(),
  father_occupation: z.string().optional(),
  mother_name: z.string().optional(),
  mother_occupation: z.string().optional(),
  family_background: z.string().optional(),

  pref_age_min: z.string().optional(),
  pref_age_max: z.string().optional(),
  pref_height_min: z.string().optional(),
  pref_height_max: z.string().optional(),
  pref_notes: z.string().optional(),
});
type Values = z.infer<typeof schema>;

const STEPS = [
  { title: "About", fields: ["profile_for", "first_name", "surname", "gender", "date_of_birth", "marital_status", "about"] },
  { title: "Appearance", fields: ["height_cm", "complexion", "food_habit"] },
  { title: "Community & horoscope", fields: ["subcaste", "gothram", "nakshatram", "raasi", "paadam", "time_of_birth", "place_of_birth"] },
  { title: "Education & career", fields: ["education", "education_detail", "occupation", "company", "work_location", "annual_income_text"] },
  { title: "Location", fields: ["country_living", "native_district", "settled_at", "region", "address"] },
  { title: "Family", fields: ["father_name", "father_occupation", "mother_name", "mother_occupation", "family_background"] },
  { title: "Partner preference", fields: ["pref_age_min", "pref_age_max", "pref_height_min", "pref_height_max", "pref_notes"] },
  { title: "Photos", fields: [] },
] as const;

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

function num(v?: string) {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const { data: ref, error: refError } = useReferenceData();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Deep link: /onboarding?step=2 jumps straight to that section.
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("step");
    const n = raw ? Number(raw) : NaN;
    if (Number.isInteger(n) && n >= 0 && n < STEPS.length) {
      queueMicrotask(() => setStep(n));
    }
  }, []);
  const [profileSaved, setProfileSaved] = useState(!!user?.has_profile);
  const [hydrated, setHydrated] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      profile_for: "self",
      first_name: "",
      gender: "",
      date_of_birth: "",
      marital_status: "unmarried",
      subcaste: "",
    },
  });

  // Prefill from an existing profile.
  useEffect(() => {
    if (!user?.has_profile || hydrated) return;
    (async () => {
      try {
        const [p, pref] = await Promise.all([
          apiFetch<Profile>("/profiles/me/"),
          apiFetch<Record<string, unknown>>("/profiles/me/partner-preference/"),
        ]);
        form.reset({
          ...form.getValues(),
          profile_for: p.profile_for || "self",
          first_name: p.first_name,
          surname: p.surname,
          gender: p.gender,
          date_of_birth: p.date_of_birth ?? "",
          marital_status: p.marital_status || "unmarried",
          about: p.about,
          height_cm: p.height_cm ? String(p.height_cm) : "",
          complexion: p.complexion,
          food_habit: p.food_habit,
          subcaste: p.subcaste,
          gothram: p.gothram,
          nakshatram: p.nakshatram ? String(p.nakshatram) : "",
          raasi: p.raasi ? String(p.raasi) : "",
          paadam: p.paadam ? String(p.paadam) : "",
          time_of_birth: p.time_of_birth,
          place_of_birth: p.place_of_birth,
          education: p.education ? String(p.education) : "",
          education_detail: p.education_detail,
          occupation: p.occupation,
          company: p.company,
          work_location: p.work_location,
          annual_income_text: p.annual_income_text,
          country_living: p.country_living,
          native_district: p.native_district,
          settled_at: p.settled_at,
          region: p.region,
          address: p.address ?? "",
          father_name: p.father_name,
          father_occupation: p.father_occupation,
          mother_name: p.mother_name,
          mother_occupation: p.mother_occupation,
          family_background: p.family_background,
          pref_age_min: pref.age_min ? String(pref.age_min) : "",
          pref_age_max: pref.age_max ? String(pref.age_max) : "",
          pref_height_min: pref.height_min_cm ? String(pref.height_min_cm) : "",
          pref_height_max: pref.height_max_cm ? String(pref.height_max_cm) : "",
          pref_notes: (pref.notes as string) ?? "",
        });
      } catch {
        /* new profile */
      } finally {
        setHydrated(true);
      }
    })();
  }, [user?.has_profile, hydrated, form]);

  const isPhotoStep = step === STEPS.length - 1;
  const progress = useMemo(
    () => Math.round(((step + (isPhotoStep ? 1 : 0)) / STEPS.length) * 100),
    [step, isPhotoStep],
  );

  async function persist(values: Values) {
    const profileBody = {
      profile_for: values.profile_for,
      first_name: values.first_name,
      surname: values.surname ?? "",
      gender: values.gender,
      date_of_birth: values.date_of_birth || null,
      marital_status: values.marital_status,
      about: values.about ?? "",
      height_cm: num(values.height_cm),
      complexion: values.complexion ?? "",
      food_habit: values.food_habit ?? "",
      subcaste: values.subcaste,
      gothram: values.gothram ?? "",
      nakshatram: num(values.nakshatram),
      raasi: num(values.raasi),
      paadam: num(values.paadam),
      time_of_birth: values.time_of_birth ?? "",
      place_of_birth: values.place_of_birth ?? "",
      education: num(values.education),
      education_detail: values.education_detail ?? "",
      occupation: values.occupation ?? "",
      company: values.company ?? "",
      work_location: values.work_location ?? "",
      annual_income_text: values.annual_income_text ?? "",
      country_living: values.country_living ?? "",
      native_district: values.native_district ?? "",
      settled_at: values.settled_at ?? "",
      region: values.region ?? "",
      address: values.address ?? "",
      father_name: values.father_name ?? "",
      father_occupation: values.father_occupation ?? "",
      mother_name: values.mother_name ?? "",
      mother_occupation: values.mother_occupation ?? "",
      family_background: values.family_background ?? "",
    };

    await apiFetch("/profiles/me/", {
      method: profileSaved ? "PATCH" : "POST",
      body: profileBody,
    });
    await apiFetch("/profiles/me/partner-preference/", {
      method: "PATCH",
      body: {
        age_min: num(values.pref_age_min),
        age_max: num(values.pref_age_max),
        height_min_cm: num(values.pref_height_min),
        height_max_cm: num(values.pref_height_max),
        notes: values.pref_notes ?? "",
      },
    });
    setProfileSaved(true);
    await refreshUser();
  }

  async function next() {
    const fields = STEPS[step].fields as unknown as (keyof Values)[];
    if (fields.length && !(await form.trigger(fields))) return;

    // Save once the last data step is done, before the photo step.
    if (step === STEPS.length - 2) {
      setSaving(true);
      try {
        await persist(form.getValues());
        toast.success("Profile saved — add a few photos to finish.");
        setStep(step + 1);
      } catch (err) {
        handleApiError(err, form);
      } finally {
        setSaving(false);
      }
      return;
    }
    setStep(step + 1);
  }

  async function saveDraftAndExit() {
    setSaving(true);
    try {
      await persist(form.getValues());
      toast.success("Saved.");
      router.push("/dashboard");
    } catch (err) {
      handleApiError(err, form);
    } finally {
      setSaving(false);
    }
  }

  if (refError) {
    return (
      <Container className="py-16 text-center text-sm text-muted-foreground">
        Couldn&apos;t load form data. Please refresh.
      </Container>
    );
  }
  if (!ref) {
    return (
      <Container className="flex justify-center py-16">
        <Spinner className="size-6 text-primary" />
      </Container>
    );
  }

  return (
    <Container className="max-w-2xl py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Step {step + 1} of {STEPS.length}
          </span>
          <span className="text-muted-foreground">{progress}% complete</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">
            {STEPS[step].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPhotoStep ? (
            <PhotoManager />
          ) : (
            <form onSubmit={(e) => e.preventDefault()}>
              <FieldGroup>
                {step === 0 && (
                  <>
                    <SelectField form={form} name="profile_for" label="This profile is for" options={ref.enums.profile_for} required />
                    <TextField form={form} name="first_name" label="Name" required />
                    <TextField form={form} name="surname" label="Surname / house name" />
                    <SelectField form={form} name="gender" label="Gender" options={ref.enums.gender} required />
                    <TextField form={form} name="date_of_birth" label="Date of birth" type="date" required />
                    <SelectField form={form} name="marital_status" label="Marital status" options={ref.enums.marital_status} required />
                    <TextareaField
                      form={form}
                      name="about"
                      label="About me"
                      description="A few lines about yourself — interests, personality, what makes you, you."
                      rows={4}
                    />
                  </>
                )}
                {step === 1 && (
                  <>
                    <SelectField form={form} name="height_cm" label="Height" options={heightOptions} />
                    <SelectField form={form} name="complexion" label="Complexion" options={ref.enums.complexion} />
                    <SelectField form={form} name="food_habit" label="Food habits" options={ref.enums.food_habit} />
                  </>
                )}
                {step === 2 && (
                  <>
                    <SelectField form={form} name="subcaste" label="Sub-caste" options={ref.enums.subcaste} required />
                    <TextField form={form} name="gothram" label="Gothram" />
                    <SelectField form={form} name="nakshatram" label="Nakshatram (birth star)" options={toChoices(ref.nakshatram)} />
                    <SelectField form={form} name="raasi" label="Raasi (moon sign)" options={toChoices(ref.raasi)} />
                    <SelectField form={form} name="paadam" label="Paadam" options={ref.enums.paadam} />
                    <TextField form={form} name="time_of_birth" label="Time of birth" placeholder="e.g. 06:45 AM" />
                    <TextField form={form} name="place_of_birth" label="Place of birth" />
                  </>
                )}
                {step === 3 && (
                  <>
                    <SelectField form={form} name="education" label="Highest education" options={toChoices(ref.education)} />
                    <TextField form={form} name="education_detail" label="Degree / details" placeholder="e.g. B.Tech (CSE), JNTU" />
                    <TextField form={form} name="occupation" label="Occupation" />
                    <TextField form={form} name="company" label="Company / employer" />
                    <TextField form={form} name="work_location" label="Work location" />
                    <TextField form={form} name="annual_income_text" label="Annual income" placeholder="e.g. 12 LPA" />
                  </>
                )}
                {step === 4 && (
                  <>
                    <TextField form={form} name="country_living" label="Currently living in (country)" />
                    <TextField form={form} name="native_district" label="Native district" />
                    <TextField form={form} name="settled_at" label="Family settled at (city)" />
                    <SelectField form={form} name="region" label="Region" options={ref.enums.region} />
                    <TextareaField form={form} name="address" label="Address" rows={3} />
                  </>
                )}
                {step === 5 && (
                  <>
                    <TextField form={form} name="father_name" label="Father's name" />
                    <TextField form={form} name="father_occupation" label="Father's occupation" />
                    <TextField form={form} name="mother_name" label="Mother's name" />
                    <TextField form={form} name="mother_occupation" label="Mother's occupation" />
                    <TextareaField form={form} name="family_background" label="Family background" rows={4} description="Siblings, family values, native place — anything relevant." />
                  </>
                )}
                {step === 6 && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <TextField form={form} name="pref_age_min" label="Age from" type="number" inputMode="numeric" />
                      <TextField form={form} name="pref_age_max" label="Age to" type="number" inputMode="numeric" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <SelectField form={form} name="pref_height_min" label="Height from" options={heightOptions} />
                      <SelectField form={form} name="pref_height_max" label="Height to" options={heightOptions} />
                    </div>
                    <TextareaField form={form} name="pref_notes" label="Other expectations" rows={3} />
                  </>
                )}
              </FieldGroup>
            </form>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || saving}
            >
              Back
            </Button>
            <div className="flex gap-2">
              {!isPhotoStep && (
                <Button variant="outline" onClick={saveDraftAndExit} disabled={saving}>
                  Save & exit
                </Button>
              )}
              {isPhotoStep ? (
                <Button onClick={() => router.push("/dashboard")}>
                  <Check className="size-4" />
                  Finish
                </Button>
              ) : (
                <Button onClick={next} disabled={saving}>
                  {saving && <Spinner />}
                  {step === STEPS.length - 2 ? "Save & add photos" : "Next"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
