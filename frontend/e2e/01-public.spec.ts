import { expect, test } from "@playwright/test";

test.describe("public site (signed out)", () => {
  test("home page renders with stats and calls to action", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/brahmamudi/i);
    // header + hero calls to action (rendered as links styled as buttons)
    await expect(page.getByRole("button", { name: "Register free" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/");
    await page.getByRole("button", { name: "I'm already a member" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/");
    await page.getByRole("button", { name: "Create your free profile" }).click();
    await expect(page).toHaveURL(/\/register/);
    await page.goto("/");
    await page.getByRole("link", { name: "Read our story" }).click();
    await expect(page).toHaveURL(/\/about/);
  });

  test("every footer link opens a real page", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    for (const [name, heading] of [
      ["About", /About brahmamudi/],
      ["Pricing", /Plans & pricing/],
      ["Contact", /Contact us/],
      ["Terms", /Terms of service/],
      ["Privacy", /Privacy policy/],
      ["Refund policy", /Refund & cancellation policy/],
    ] as const) {
      await page.goto("/");
      await footer.getByRole("link", { name, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    }
  });

  test("pricing shows the live plans and links onward", async ({ page }) => {
    await page.goto("/pricing");
    for (const price of ["₹1,450", "₹1,950", "₹2,950"]) await expect(page.getByText(price)).toBeVisible();
    await expect(page.getByText("Validity: 6 months")).toBeVisible();
    await expect(page.getByText("Validity: 2 years")).toBeVisible();
    await expect(page.getByText(/GST|\+ tax/i)).toHaveCount(0);
    await page.getByRole("main").getByRole("button", { name: "Register free" }).click();
    await expect(page).toHaveURL(/\/register/);
    await page.goto("/pricing");
    await page.getByRole("button", { name: "Choose Gold" }).click();
    await expect(page).toHaveURL(/\/(membership|login)/); // signed out -> login
  });

  test("contact page has working phone, WhatsApp and email links", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(1);
    await expect(page.locator('a[href^="https://wa.me/"]')).toHaveAttribute("href", /wa\.me\/918297111166/);
    await expect(page.locator('a[href^="mailto:"]').first()).toHaveAttribute("href", /brahmamudi36@gmail\.com/);
  });

  test("privacy names the grievance officer", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByText("Sai Musunuru")).toBeVisible();
  });

  test("member pages redirect to login when signed out", async ({ page }) => {
    for (const path of ["/dashboard", "/search", "/membership", "/admin"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login\?next=/);
    }
  });

  test("unknown page shows 404", async ({ page }) => {
    const res = await page.goto("/this-does-not-exist");
    expect(res?.status()).toBe(404);
  });
});
