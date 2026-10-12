import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import OnboardingPage from "./page";

const { apiFetch, refreshUser, push } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  refreshUser: vi.fn(),
  push: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ apiFetch }));
vi.mock("@/lib/form", () => ({ handleApiError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: push }) }));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { has_profile: false }, refreshUser }),
}));
vi.mock("@/lib/reference", () => ({
  // every enum lookup returns an empty choice list
  useReferenceData: () => ({
    data: {
      enums: new Proxy({}, { get: () => [] }),
      nakshatram: [],
      raasi: [],
      education: [],
    },
    error: false,
  }),
  toChoices: () => [],
}));
vi.mock("@/components/onboarding/photo-manager", () => ({
  PhotoManager: () => <p>photo manager</p>,
}));

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue({});
  window.history.replaceState(null, "", "/onboarding");
});

describe("onboarding wizard", () => {
  it("starts at step 1 and blocks Next until required fields are filled", async () => {
    render(<OnboardingPage />);
    expect(screen.getByText("Step 1 of 8")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Enter a name.")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 8")).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("deep-links to a step with ?step=N", async () => {
    window.history.replaceState(null, "", "/onboarding?step=5");
    render(<OnboardingPage />);
    expect(await screen.findByText("Step 6 of 8")).toBeInTheDocument();
    expect(screen.getByText("Family")).toBeInTheDocument();
  });

  it("saves the profile and partner preference before the photo step", async () => {
    window.history.replaceState(null, "", "/onboarding?step=6");
    render(<OnboardingPage />);
    expect(await screen.findByText("Partner preference")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save & add photos" }));

    expect(await screen.findByText("photo manager")).toBeInTheDocument();
    expect(screen.getByText("Step 8 of 8")).toBeInTheDocument();
    const calls = apiFetch.mock.calls.map(([url, opts]) => [url, opts?.method]);
    expect(calls).toEqual([
      ["/profiles/me/", "POST"],
      ["/profiles/me/partner-preference/", "PATCH"],
    ]);
    await waitFor(() => expect(refreshUser).toHaveBeenCalled());
  });
});
