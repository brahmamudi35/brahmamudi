"use client";

import type {
  FieldValues,
  Path,
  UseFormReturn,
} from "react-hook-form";
import { Controller } from "react-hook-form";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Choice } from "@/lib/types";

interface BaseProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  description?: string;
  required?: boolean;
}

function errorMessage<T extends FieldValues>(form: UseFormReturn<T>, name: Path<T>) {
  const err = form.formState.errors[name];
  return err?.message ? String(err.message) : undefined;
}

export function TextField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  required,
  type = "text",
  ...input
}: BaseProps<T> & Omit<React.ComponentProps<typeof Input>, "form" | "name">) {
  const msg = errorMessage(form, name);
  return (
    <Field data-invalid={!!msg}>
      <FieldLabel htmlFor={name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </FieldLabel>
      <Input
        id={name}
        type={type}
        aria-invalid={!!msg}
        {...form.register(name)}
        {...input}
      />
      {description && !msg && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{msg}</FieldError>
    </Field>
  );
}

export function TextareaField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  required,
  ...props
}: BaseProps<T> & Omit<React.ComponentProps<typeof Textarea>, "form" | "name">) {
  const msg = errorMessage(form, name);
  return (
    <Field data-invalid={!!msg}>
      <FieldLabel htmlFor={name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </FieldLabel>
      <Textarea id={name} aria-invalid={!!msg} {...form.register(name)} {...props} />
      {description && !msg && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{msg}</FieldError>
    </Field>
  );
}

export function SelectField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  required,
  options,
  placeholder = "Select…",
}: BaseProps<T> & { options: Choice[]; placeholder?: string }) {
  const msg = errorMessage(form, name);
  // Select.Value only shows the raw stored value unless given this
  // value -> label map, so it can display the matching option's label.
  const items = Object.fromEntries(options.map((o) => [String(o.value), o.label]));
  return (
    <Field data-invalid={!!msg}>
      <FieldLabel htmlFor={name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </FieldLabel>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <Select
            items={items}
            value={field.value ? String(field.value) : ""}
            onValueChange={field.onChange}
          >
            <SelectTrigger id={name} aria-invalid={!!msg} className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={String(o.value)} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {description && !msg && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{msg}</FieldError>
    </Field>
  );
}
