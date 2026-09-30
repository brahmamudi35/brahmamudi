"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useReferenceData } from "@/lib/reference";
import type { Choice } from "@/lib/types";
import { cn } from "@/lib/utils";

import { MemberRow } from "./member-row";
import {
  BLANK_FILTERS,
  buildMemberQuery,
  EDUCATION_OPTIONS,
  type MemberFilters,
  useMatchCount,
  useMemberList,
} from "./member-search";

const START: MemberFilters = { ...BLANK_FILTERS, preset: "all" };

const STEPS = [
  "who", "age", "subcaste", "region", "marital",
  "qualification", "career", "extras",
] as const;
type StepId = (typeof STEPS)[number];

export function GuidedSearch({ onChange }: { onChange: () => void }) {
  const { data: ref } = useReferenceData();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<MemberFilters>(START);
  const [lookup, setLookup] = useState("");

  const done = step >= STEPS.length;
  const id: StepId | null = done ? null : STEPS[step];
  const set = (patch: Partial<MemberFilters>) => setF((s) => ({ ...s, ...patch }));

  function runLookup(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!lookup.trim()) return;
    setF((s) => ({ ...s, search: lookup.trim() }));
    setStep(STEPS.length);
  }

  const countQuery = useMemo(
    () => buildMemberQuery(f, { limit: 1 }),
    [f],
  );
  const running = useMatchCount(countQuery);

  if (done) return <Results filters={f} onRestart={() => { setF(START); setLookup(""); setStep(0); }} onBack={() => setStep(STEPS.length - 1)} onChange={onChange} />;

  const enums = ref?.enums;

  return (
    <div className="mx-auto max-w-xl">
      <form onSubmit={runLookup} className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
            placeholder="Know exactly who? Search by profile number, name, email or phone…"
            className="h-9 w-full rounded-md border bg-background pl-8 pr-2 text-sm outline-none focus-visible:border-ring"
          />
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={!lookup.trim()}>
          Look up
        </Button>
      </form>
      <div className="mb-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        or answer a few questions to browse
        <div className="h-px flex-1 bg-border" />
      </div>

      <Progress step={step} total={STEPS.length} />

      <div className="mt-6 min-h-[220px]">
        {id === "who" && (
          <Question title="Who are you searching for?">
            <div className="grid grid-cols-3 gap-2">
              <Choose active={f.gender === "F"} onClick={() => set({ gender: "F" })}>
                Bride
              </Choose>
              <Choose active={f.gender === "M"} onClick={() => set({ gender: "M" })}>
                Groom
              </Choose>
              <Choose active={f.gender === ""} onClick={() => set({ gender: "" })}>
                Either
              </Choose>
            </div>
          </Question>
        )}

        {id === "age" && (
          <Question title="What age range?" hint="Leave blank for any age.">
            <div className="flex items-center gap-3">
              <NumInput
                value={f.age_min}
                onChange={(v) => set({ age_min: v })}
                placeholder="From"
              />
              <span className="text-muted-foreground">to</span>
              <NumInput
                value={f.age_max}
                onChange={(v) => set({ age_max: v })}
                placeholder="To"
              />
              <span className="text-sm text-muted-foreground">years</span>
            </div>
          </Question>
        )}

        {id === "subcaste" && (
          <Question title="Any sub-caste preference?" hint="Pick one or more, or leave on Any.">
            <MultiChips
              options={enums?.subcaste}
              value={f.subcaste}
              onChange={(v) => set({ subcaste: v })}
            />
          </Question>
        )}

        {id === "region" && (
          <Question title="Which region?" hint="Pick one or more, or leave on Any.">
            <MultiChips
              options={enums?.region}
              value={f.region}
              onChange={(v) => set({ region: v })}
            />
          </Question>
        )}

        {id === "marital" && (
          <Question title="Marital status?">
            <Chips
              options={enums?.marital_status}
              value={f.marital_status}
              onChange={(v) => set({ marital_status: v })}
            />
          </Question>
        )}

        {id === "qualification" && (
          <Question title="Qualification?" hint="Pick one or more, or leave on Any.">
            <MultiChips
              options={EDUCATION_OPTIONS}
              value={f.education}
              onChange={(v) => set({ education: v })}
            />
          </Question>
        )}

        {id === "career" && (
          <Question title="Position & work location?" hint="Optional. Matches part of the text.">
            <div className="space-y-3">
              <TextInput
                label="Position / role"
                value={f.designation}
                onChange={(v) => set({ designation: v })}
                placeholder="e.g. Software Engineer, Doctor"
              />
              <TextInput
                label="Present work location"
                value={f.work_location}
                onChange={(v) => set({ work_location: v })}
                placeholder="e.g. Hyderabad, USA"
              />
            </div>
          </Question>
        )}

        {id === "extras" && (
          <Question title="Anything else?" hint="Optional final filters.">
            <div className="space-y-2">
              <Chips
                label="Verification"
                options={[
                  { value: "true", label: "Verified only" },
                  { value: "false", label: "Not verified" },
                ]}
                value={f.is_verified}
                onChange={(v) => set({ is_verified: v })}
              />
              <Chips
                label="Photo"
                options={[
                  { value: "yes", label: "Has a photo" },
                  { value: "no", label: "No photo" },
                  { value: "pending", label: "Photo pending review" },
                ]}
                value={f.has_photo}
                onChange={(v) => set({ has_photo: v })}
              />
              <Chips
                label="Status"
                options={enums?.profile_status}
                value={f.status}
                onChange={(v) => set({ status: v })}
              />
            </div>
          </Question>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        <span className="text-xs text-muted-foreground">
          {running == null ? "…" : `≈ ${running.toLocaleString()} members`}
        </span>

        {step < STEPS.length - 1 ? (
          <Button size="sm" onClick={() => setStep((s) => s + 1)}>
            Next
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button size="sm" onClick={() => setStep(STEPS.length)}>
            <Search className="size-4" />
            Show results
          </Button>
        )}
      </div>
    </div>
  );
}

function Results({
  filters,
  onRestart,
  onBack,
  onChange,
}: {
  filters: MemberFilters;
  onRestart: () => void;
  onBack: () => void;
  onChange: () => void;
}) {
  const query = useMemo(() => buildMemberQuery(filters, { limit: 25 }), [filters]);
  const { rows, count, busy, loadingMore, act, loadMore } = useMemberList(query);

  const summary = [
    filters.search && `"${filters.search}"`,
    filters.gender === "F" ? "Brides" : filters.gender === "M" ? "Grooms" : "Members",
    filters.age_min || filters.age_max
      ? `${filters.age_min || "any"}–${filters.age_max || "any"} yrs`
      : null,
    filters.subcaste.join(" / "),
    filters.region.join(" / "),
    filters.education
      .map((e) => EDUCATION_OPTIONS.find((o) => o.value === e)?.label ?? e)
      .join(" / "),
    filters.marital_status,
    filters.designation && `role: ${filters.designation}`,
    filters.work_location && `at: ${filters.work_location}`,
    filters.is_verified === "true" ? "verified" : filters.is_verified === "false" ? "unverified" : null,
    filters.has_photo === "yes" ? "with photo" : filters.has_photo === "no" ? "no photo" : filters.has_photo === "pending" ? "photo pending" : null,
    filters.status,
  ].filter(Boolean);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/20 p-3">
        <div className="text-sm">
          <span className="font-medium">
            {rows ? `${count.toLocaleString()} match` : "Searching…"}
          </span>
          <span className="ml-2 text-xs capitalize text-muted-foreground">
            {summary.join(" · ")}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="size-4" />
            Refine
          </Button>
          <Button variant="ghost" size="sm" onClick={onRestart}>
            <RotateCcw className="size-4" />
            Start over
          </Button>
        </div>
      </div>

      {!rows ? (
        <Spinner className="text-primary" />
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No members match. Loosen a filter with “Refine”.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <MemberRow
              key={p.id}
              p={p}
              busy={busy === p.id}
              onAct={(id, a) => act(id, a).then(onChange)}
            />
          ))}
          {rows.length < count && (
            <Button
              variant="outline"
              className="w-full"
              disabled={loadingMore}
              onClick={loadMore}
            >
              {loadingMore ? <Spinner /> : `Load more (${count - rows.length} left)`}
            </Button>
          )}
        </div>
      )}
    </>
  );
}

function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full",
            i <= step ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}

function Question({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="font-heading text-lg font-semibold">{title}</h3>
      {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Choose({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-4 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "hover:bg-muted/50",
      )}
    >
      {children}
    </button>
  );
}

/** "Goldsmith (Ausula / Swarnakara)" -> "Goldsmith" */
export const shortLabel = (s: string) => s.split(" (")[0].trim();

function Chips({
  options,
  value,
  onChange,
  label,
}: {
  options?: Choice[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div>
      {label && (
        <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        <Chip active={value === ""} onClick={() => onChange("")}>
          Any
        </Chip>
        {options?.map((o) => (
          <Chip
            key={String(o.value)}
            active={value === String(o.value)}
            onClick={() => onChange(String(o.value))}
          >
            {shortLabel(o.label)}
          </Chip>
        ))}
      </div>
    </div>
  );
}

export function MultiChips({
  options,
  value,
  onChange,
  label,
}: {
  options?: Choice[];
  value: string[];
  onChange: (v: string[]) => void;
  label?: string;
}) {
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div>
      {label && (
        <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        <Chip active={value.length === 0} onClick={() => onChange([])}>
          Any
        </Chip>
        {options?.map((o) => (
          <Chip
            key={String(o.value)}
            active={value.includes(String(o.value))}
            onClick={() => toggle(String(o.value))}
          >
            {shortLabel(o.label)}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "hover:bg-muted/50",
      )}
    >
      {children}
    </button>
  );
}

function NumInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 2))}
      inputMode="numeric"
      placeholder={placeholder}
      className="h-9 w-20 rounded-md border bg-background px-2 text-sm outline-none focus-visible:border-ring"
    />
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border bg-background px-2 text-sm outline-none focus-visible:border-ring"
      />
    </label>
  );
}
