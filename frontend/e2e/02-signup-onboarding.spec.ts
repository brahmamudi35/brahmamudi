import { expect, test } from "@playwright/test";

import { field, onlyCode, PASSWORD, pickSelect, pngBuffer } from "./helpers";

const email = `newbie${Date.now()}@e2e.test`;

test.describe.serial("new member: register → verify → onboarding → photo", () => {
  test("register validates, then creates the account", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Tell us your name.")).toBeVisible();
    await expect(page.getByText("Enter a valid email.")).toBeVisible();

    await page.getByLabel("Your name").fill("Meena Test");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("12345678");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Can't be all numbers.")).toBeVisible();

    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/verify-email\?sent=1/);
    await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    // resend is on a cooldown right after signup
    await expect(page.getByRole("button", { name: /Resend code in \d+s/ })).toBeDisabled();

    // wrong code first
    await page.getByLabel("6-digit code").fill("000000");
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByText(/incorrect|invalid/i)).toBeVisible();

    const code = await onlyCode(email, "verification");
    await page.getByLabel("6-digit code").fill(code);
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByText("Email verified", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Set up your profile" }).click();
    await expect(page).toHaveURL(/\/onboarding/);

    // ---- onboarding wizard ------------------------------------------------
    await expect(page.getByText("Step 1 of 8")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Step 1 of 8")).toBeVisible(); // required fields block
    await field(page, "Name").fill("Meena");
    await field(page, "Surname / house name").fill("Kammari");
    await pickSelect(page, "Gender", /Female|Bride/);
    await field(page, "Date of birth").fill("1997-06-15");
    await page.getByRole("button", { name: "Next" }).click();

    await expect(page.getByText("Step 2 of 8")).toBeVisible();
    await pickSelect(page, "Height", /5′ 3″/);
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByText("Step 1 of 8")).toBeVisible();
    await expect(field(page, "Name")).toHaveValue("Meena"); // kept
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();

    await expect(page.getByText("Step 3 of 8")).toBeVisible();
    await pickSelect(page, "Sub-caste", /Goldsmith/);
    await field(page, "Gothram").fill("Sanaga");
    await pickSelect(page, "Nakshatram (birth star)", /.+/);
    await page.getByRole("button", { name: "Next" }).click();

    await expect(page.getByText("Step 4 of 8")).toBeVisible();
    await field(page, "Occupation").fill("Teacher");
    await field(page, "Work location").fill("Warangal");
    await page.getByRole("button", { name: "Next" }).click();

    await expect(page.getByText("Step 5 of 8")).toBeVisible();
    await field(page, "Native district").fill("Warangal");
    await page.getByRole("button", { name: "Next" }).click();

    await expect(page.getByText("Step 6 of 8")).toBeVisible();
    await field(page, "Father's name").fill("Ramulu");
    await page.getByRole("button", { name: "Next" }).click();

    await expect(page.getByText("Step 7 of 8")).toBeVisible();
    await field(page, "Age from").fill("26");
    await field(page, "Age to").fill("33");
    await page.getByRole("button", { name: "Save & add photos" }).click();

    await expect(page.getByText("Step 8 of 8")).toBeVisible();
    await page.locator('input[type="file"]').first().setInputFiles({
      name: "me.png",
      mimeType: "image/png",
      buffer: pngBuffer(320, 400),
    });
    await expect(page.locator("img[src*='profile_photos']").first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("the new profile shows on the dashboard and needs no more verification", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/Verify your email/)).toHaveCount(0);
    await expect(page.getByText(/% complete/)).toBeVisible();
  });
});
