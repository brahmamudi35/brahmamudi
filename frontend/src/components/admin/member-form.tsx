"use client";

import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";

import { SelectField, TextField, TextareaField } from "@/components/form/fields";
import { FieldGroup } from "@/components/ui/field";
import { toChoices, type ReferenceData } from "@/lib/reference";

/** Staff member form (Add member / Edit member): one scrollable page of
 * titled sections. Values are all strings; toMemberBody converts them. */
export type MemberValues = Record<string, string>;

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

const TEXT_FIELDS = [
  "regno", "profile_for", "first_name", "surname", "gender", "date_of_birth",
  "marital_status", "mother_tongue", "complexion", "food_habit",
  "subcaste", "gothram", "time_of_birth", "place_of_birth",
  "education_detail", "occupation", "company", "designation", "work_location",
  "annual_income_text", "country_living", "native_district", "settled_at", "region",
  "address", "father_name", "father_occupation", "mother_name", "mother_occupation",
  "family_background", "about", "expectations",
  "contact_phone", "parent_phone", "contact_notes",
] as const;
const NUMBER_FIELDS = ["height_cm", "nakshatram", "raasi", "paadam", "education"] as const;

const str = (v: unknown) => (v == null ? "" : String(v));
const num = (v?: string) => (v ? Number(v) : null);

/** Form values from a member record (or blanks for a new member). */
export function toMemberValues(data?: Record<string, unknown>): MemberValues {
  const v: MemberValues = { email: str(data?.email), phone: str(data?.phone) };
  for (const f of [...TEXT_FIELDS, ...NUMBER_FIELDS]) v[f] = str(data?.[f]);
  if (!data) {
    v.profile_for = "self";
    v.mother_tongue = "Telugu";
  }
  return v;
}

/** Request body for POST/PATCH /moderation/profiles/. */
export function toMemberBody(values: MemberValues) {
  const body: Record<string, unknown> = {
    user: { email: values.email, phone: values.phone },
    date_of_birth: values.date_of_birth || null,
  };
  for (const f of TEXT_FIELDS) if (f !== "date_of_birth") body[f] = values[f] ?? "";
  for (const f of NUMBER_FIELDS) body[f] = num(values[f]);
  return body;
}

export function MemberFormSections({
  form,
  refData,
  isNew = false,
}: {
  form: UseFormReturn<MemberValues>;
  refData: ReferenceData;
  isNew?: boolean;
}) {
  const e = refData.enums;
  return (
    <div className="space-y-8">
      <Section title="Account">
        {isNew ? (
          <p className="text-sm text-muted-foreground">
            The profile number is given automatically when you create the member.
          </p>
        ) : (
          <TextField
            form={form}
            name="regno"
            label="Profile number"
            description="Shown to members on the profile. Must be unique."
          />
        )}
        <Grid>
          <TextField
            form={form}
            name="email"
            label="Login email"
            type="email"
            description={
              isNew ? "Optional. The member uses it to set their own password." : undefined
            }
          />
          <TextField form={form} name="phone" label="Account phone" />
        </Grid>
      </Section>

      <Section title="Basic details">
        <Grid>
          <SelectField form={form} name="profile_for" label="Profile is for" options={e.profile_for} />
          <TextField form={form} name="first_name" label="Name" required />
          <TextField form={form} name="surname" label="Surname" />
          <SelectField form={form} name="gender" label="Gender" options={e.gender} required />
          <TextField form={form} name="date_of_birth" label="Date of birth" type="date" />
          <SelectField form={form} name="marital_status" label="Marital status" options={e.marital_status} />
          <TextField form={form} name="mother_tongue" label="Mother tongue" />
          <SelectField form={form} name="height_cm" label="Height" options={heightOptions} />
          <SelectField form={form} name="complexion" label="Complexion" options={e.complexion} />
          <SelectField form={form} name="food_habit" label="Food habits" options={e.food_habit} />
        </Grid>
      </Section>

      <Section title="Community & horoscope">
        <Grid>
          <SelectField form={form} name="subcaste" label="Sub-caste" options={e.subcaste} />
          <TextField form={form} name="gothram" label="Gothram" />
          <SelectField form={form} name="nakshatram" label="Nakshatram" options={toChoices(refData.nakshatram)} />
          <SelectField form={form} name="raasi" label="Raasi" options={toChoices(refData.raasi)} />
          <SelectField form={form} name="paadam" label="Paadam" options={e.paadam} />
          <TextField form={form} name="time_of_birth" label="Time of birth" placeholder="e.g. 06:45 AM" />
          <TextField form={form} name="place_of_birth" label="Place of birth" />
        </Grid>
      </Section>

      <Section title="Education & career">
        <Grid>
          <SelectField form={form} name="education" label="Qualification" options={toChoices(refData.education)} />
          <TextField form={form} name="education_detail" label="Education detail" placeholder="e.g. B.Tech (CSE), JNTU" />
          <TextField form={form} name="occupation" label="Occupation" />
          <TextField form={form} name="company" label="Company" />
          <TextField form={form} name="designation" label="Designation" />
          <TextField form={form} name="work_location" label="Work location" />
          <TextField form={form} name="annual_income_text" label="Annual income" />
        </Grid>
      </Section>

      <Section title="Location">
        <Grid>
          <TextField form={form} name="country_living" label="Living in (country)" />
          <TextField form={form} name="native_district" label="Native district" />
          <TextField form={form} name="settled_at" label="Family settled at (city)" />
          <SelectField form={form} name="region" label="Region" options={e.region} />
        </Grid>
        <TextareaField form={form} name="address" label="Address" rows={2} />
      </Section>

      <Section title="Family">
        <Grid>
          <TextField form={form} name="father_name" label="Father's name" />
          <TextField form={form} name="father_occupation" label="Father's occupation" />
          <TextField form={form} name="mother_name" label="Mother's name" />
          <TextField form={form} name="mother_occupation" label="Mother's occupation" />
        </Grid>
        <TextareaField form={form} name="family_background" label="Family background" rows={3} />
      </Section>

      <Section title="About & expectations">
        <TextareaField form={form} name="about" label="About" rows={3} />
        <TextareaField form={form} name="expectations" label="Partner expectations" rows={3} />
      </Section>

      <Section title="Contact">
        <Grid>
          <TextField form={form} name="contact_phone" label="Contact mobile" />
          <TextField form={form} name="parent_phone" label="Parent's mobile" />
        </Grid>
        <TextareaField form={form} name="contact_notes" label="Contact notes (staff)" rows={2} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 border-b pb-1.5 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <FieldGroup>{children}</FieldGroup>
    </section>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}
