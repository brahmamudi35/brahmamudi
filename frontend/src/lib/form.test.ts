import { describe, expect, it, vi } from "vitest";

import { handleApiError } from "./form";
import type { ApiError } from "./types";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

function fakeForm(fields: Record<string, unknown>) {
  const setError = vi.fn();
  return {
    form: {
      getValues: () => fields,
      setError,
    } as unknown as Parameters<typeof handleApiError>[1],
    setError,
  };
}

describe("handleApiError", () => {
  it("toasts a generic message for a non-ApiError", () => {
    const msg = handleApiError(new Error("boom"));
    expect(msg).toMatch(/something went wrong/i);
    expect(toastError).toHaveBeenCalledWith(msg);
  });

  it("toasts the detail when there is no form", () => {
    const err: ApiError = { status: 402, detail: "Upgrade required." };
    handleApiError(err);
    expect(toastError).toHaveBeenCalledWith("Upgrade required.");
  });

  it("routes known field errors onto the form, no toast", () => {
    const { form, setError } = fakeForm({ email: "", phone: "" });
    const err: ApiError = {
      status: 400,
      detail: "Already taken.",
      fields: { email: ["Already taken."] },
    };
    handleApiError(err, form);
    expect(setError).toHaveBeenCalledWith("email", {
      type: "server",
      message: "Already taken.",
    });
    expect(toastError).not.toHaveBeenCalled();
  });

  it("toasts when the errored field is not on the form", () => {
    const { form, setError } = fakeForm({ email: "" });
    const err: ApiError = {
      status: 400,
      detail: "Bad plan.",
      fields: { plan: ["Unknown plan."] },
    };
    handleApiError(err, form);
    expect(setError).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("Bad plan.");
  });

  it("ignores non_field_errors as a field key", () => {
    const { form, setError } = fakeForm({ email: "" });
    handleApiError(
      { status: 400, detail: "x", fields: { non_field_errors: ["nope"] } },
      form,
    );
    expect(setError).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("x");
  });
});
