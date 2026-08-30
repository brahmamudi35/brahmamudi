import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import type { ApiError } from "@/lib/types";

function isApiError(e: unknown): e is ApiError {
  return !!e && typeof e === "object" && "detail" in e && "status" in e;
}

/**
 * Map a thrown ApiError onto a react-hook-form instance. Field-level DRF errors
 * become form errors; anything else is surfaced as a toast and returned.
 */
export function handleApiError<T extends FieldValues>(
  error: unknown,
  form?: UseFormReturn<T>,
): string {
  if (!isApiError(error)) {
    const msg = "Something went wrong. Please try again.";
    toast.error(msg);
    return msg;
  }

  let matched = false;
  if (form && error.fields) {
    const known = new Set(Object.keys(form.getValues()));
    for (const [key, msgs] of Object.entries(error.fields)) {
      const message = msgs.join(" ");
      if (key === "non_field_errors" || key === "detail") continue;
      if (known.has(key)) {
        form.setError(key as Path<T>, { type: "server", message });
        matched = true;
      }
    }
  }

  if (!matched) toast.error(error.detail);
  return error.detail;
}
