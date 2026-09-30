"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Choice, Nakshatram } from "@/lib/types";

export interface Filters {
  q: string;
  age_min: string;
  age_max: string;
  height_min: string;
  height_max: string;
  subcaste: string[];
  marital_status: string[];
  region: string[];
  food_habit: string[];
  nakshatram: string;
  gothram: string;
  country_living: string;
  ordering: string;
}

export const EMPTY_FILTERS: Filters = {
  q: "",
  age_min: "",
  age_max: "",
  height_min: "",
  height_max: "",
  subcaste: [],
  marital_status: [],
  region: [],
  food_habit: [],
  nakshatram: "",
  gothram: "",
  country_living: "",
  ordering: "-created_at",
};

export function filtersToQuery(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  const put = (k: string, v: string) => v && p.set(k, v);
  put("search", f.q);
  put("age_min", f.age_min);
  put("age_max", f.age_max);
  put("height_min", f.height_min);
  put("height_max", f.height_max);
  put("nakshatram", f.nakshatram);
  put("gothram", f.gothram);
  put("country_living", f.country_living);
  put("ordering", f.ordering);
  for (const v of f.subcaste) p.append("subcaste", v);
  for (const v of f.marital_status) p.append("marital_status", v);
  for (const v of f.region) p.append("region", v);
  for (const v of f.food_habit) p.append("food_habit", v);
  return p;
}

/** Plain object form for persisting a saved search (server-consumable). */
export function filtersToObject(f: Filters): Record<string, string | string[]> {
  const o: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(f)) {
    if (k === "ordering") continue;
    if (Array.isArray(v) ? v.length : v) o[k === "q" ? "search" : k] = v;
  }
  return o;
}

export function objectToFilters(o: Record<string, string | string[]>): Filters {
  const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : v ? [String(v)] : []);
  const str = (v: unknown) => (v == null ? "" : String(v));
  return {
    ...EMPTY_FILTERS,
    q: str(o.search ?? o.q),
    age_min: str(o.age_min),
    age_max: str(o.age_max),
    height_min: str(o.height_min),
    height_max: str(o.height_max),
    nakshatram: str(o.nakshatram),
    gothram: str(o.gothram),
    country_living: str(o.country_living),
    subcaste: arr(o.subcaste),
    marital_status: arr(o.marital_status),
    region: arr(o.region),
    food_habit: arr(o.food_habit),
  };
}

const ORDERING: Choice[] = [
  { value: "-created_at", label: "Newest first" },
  { value: "date_of_birth", label: "Age: youngest" },
  { value: "-date_of_birth", label: "Age: oldest" },
  { value: "-height_cm", label: "Height: tallest" },
];

interface Props {
  value: Filters;
  onChange: (next: Filters) => void;
  enums: {
    subcaste: Choice[];
    marital_status: Choice[];
    region: Choice[];
    food_habit: Choice[];
  };
  nakshatram: Nakshatram[];
}

export function SearchFilters({ value, onChange, enums, nakshatram }: Props) {
  const set = <K extends keyof Filters>(key: K, v: Filters[K]) =>
    onChange({ ...value, [key]: v });

  const toggle = (key: "subcaste" | "marital_status" | "region" | "food_habit", v: string) => {
    const list = value[key];
    set(key, list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  };

  return (
    <div className="space-y-5 text-sm">
      <div className="space-y-1.5">
        <Label htmlFor="q">Keyword</Label>
        <Input
          id="q"
          placeholder="Name, profile number, reg. no, job…"
          value={value.q}
          onChange={(e) => set("q", e.target.value)}
        />
      </div>

      <div>
        <Label>Age</Label>
        <div className="mt-1.5 flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={value.age_min}
            onChange={(e) => set("age_min", e.target.value)}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            placeholder="Max"
            value={value.age_max}
            onChange={(e) => set("age_max", e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label>Height (cm)</Label>
        <div className="mt-1.5 flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={value.height_min}
            onChange={(e) => set("height_min", e.target.value)}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            placeholder="Max"
            value={value.height_max}
            onChange={(e) => set("height_max", e.target.value)}
          />
        </div>
      </div>

      <Separator />
      <CheckGroup label="Sub-caste" options={enums.subcaste} selected={value.subcaste} onToggle={(v) => toggle("subcaste", v)} />
      <CheckGroup label="Marital status" options={enums.marital_status} selected={value.marital_status} onToggle={(v) => toggle("marital_status", v)} />
      <CheckGroup label="Region" options={enums.region} selected={value.region} onToggle={(v) => toggle("region", v)} />
      <CheckGroup label="Food habits" options={enums.food_habit} selected={value.food_habit} onToggle={(v) => toggle("food_habit", v)} />
      <Separator />

      <div className="space-y-1.5">
        <Label>Nakshatram</Label>
        <Select
          value={value.nakshatram || "any"}
          onValueChange={(v) => set("nakshatram", !v || v === "any" ? "" : String(v))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any star</SelectItem>
            {nakshatram.map((n) => (
              <SelectItem key={n.id} value={String(n.order)}>
                {n.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="gothram">Gothram</Label>
        <Input
          id="gothram"
          value={value.gothram}
          onChange={(e) => set("gothram", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="country">Country</Label>
        <Input
          id="country"
          placeholder="e.g. India, United States"
          value={value.country_living}
          onChange={(e) => set("country_living", e.target.value)}
        />
      </div>

      <Separator />
      <div className="space-y-1.5">
        <Label>Sort by</Label>
        <Select
          value={value.ordering}
          onValueChange={(v) => set("ordering", String(v ?? "-created_at"))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORDERING.map((o) => (
              <SelectItem key={String(o.value)} value={String(o.value)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function CheckGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: Choice[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-1.5">
        {options.map((o) => (
          <label
            key={String(o.value)}
            className="flex cursor-pointer items-center gap-2"
          >
            <Checkbox
              checked={selected.includes(String(o.value))}
              onCheckedChange={() => onToggle(String(o.value))}
            />
            <span className="text-muted-foreground">{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
