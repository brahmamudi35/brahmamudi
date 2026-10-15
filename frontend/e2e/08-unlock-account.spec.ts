import { expect, type Page, test } from "@playwright/test";

import { emailsTo, field, login, PASSWORD, pdfBuffer } from "./helpers";

async function openProfile(page: Page, name: string) {
  await page.goto("/search");
  await page.getByPlaceholder(/Name, profile number/).first().fill(name);
  await page.getByText(name).first().click();
  await expect(page).toHaveURL(/\/profiles\/\d+/);
}

test.describe.serial("paid member + account settings", () => {
  test("Gold member unlocks a contact; quota goes down", async ({ page }) => {
    // staff granted groom@ a Gold plan in 07-staff
    await login(page, "groom@e2e.test");
    await page.goto("/membership");
    await expect(page.getByText(/Current plan:\s*Gold/)).toBeVisible();
    await expect(page.getByText("Contact views: 50 left")).toBeVisible();

    await openProfile(page, "Padma");
    await page.getByRole("button", { name: "Unlock contact" }).click();
    await expect(page.getByText("98480")).toBeVisible(); // seeded phone prefix
    await page.goto("/membership");
    await expect(page.getByText("Contact views: 49 left")).toBeVisible();
  });

  test("horoscope: upload, replace, remove (auto-approved, staff queue stays empty)", async ({ page }) => {
    await login(page, "bride@e2e.test");
    await page.getByRole("button", { name: "Lakshmi" }).click();
    await page.getByRole("menuitem", { name: "Photos" }).click();
    await expect(page).toHaveURL(/\/profile\/photos/);
    const file = page.locator('input[type="file"][accept*="pdf"]');
    await file.setInputFiles({ name: "jatakam.pdf", mimeType: "application/pdf", buffer: pdfBuffer() });
    await expect(page.getByText("Approved")).toBeVisible(); // AUTO_APPROVE_PHOTOS is on
    await expect(page.getByRole("button", { name: "Replace" })).toBeVisible();
    await file.setInputFiles({ name: "jatakam2.pdf", mimeType: "application/pdf", buffer: pdfBuffer() });
    await expect(page.getByText("Approved")).toBeVisible();

    await page.getByRole("button", { name: "Remove horoscope" }).click();
    const confirm = page.getByRole("alertdialog");
    if (await confirm.isVisible().catch(() => false)) await confirm.getByRole("button", { name: /Remove|Delete/ }).click();
    await expect(page.getByRole("button", { name: "Upload horoscope" })).toBeVisible();

    await file.setInputFiles({ name: "jatakam.pdf", mimeType: "application/pdf", buffer: pdfBuffer() });
    await expect(page.getByText("Approved")).toBeVisible();

    await page.evaluate(() => localStorage.clear());
    await login(page, "staff@e2e.test");
    await page.goto("/admin");
    await page.getByRole("button", { name: "Horoscopes", exact: true }).click();
    await expect(page.getByText("No horoscopes waiting for review.")).toBeVisible();
  });

  test("account: digest toggle and change password", async ({ page }) => {
    await login(page, "groom8@e2e.test");
    await page.getByRole("button", { name: "Suresh" }).click();
    await page.getByRole("menuitem", { name: /Account/ }).click();
    await expect(page).toHaveURL(/\/account/);

    const digest = page.getByRole("checkbox").first();
    const was = await digest.isChecked();
    await digest.click();
    await expect(digest).toBeChecked({ checked: !was });
    await page.reload();
    await expect(page.getByRole("checkbox").first()).toBeChecked({ checked: !was });

    await field(page, "Current password").fill("wrong-one-1");
    await field(page, "New password").fill("Newer-pass-456");
    await field(page, "Confirm new password").fill("Newer-pass-456");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Current password is incorrect.")).toBeVisible();
    await field(page, "Current password").fill(PASSWORD);
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText(/Password (changed|updated)/i).first()).toBeVisible();

    await page.evaluate(() => localStorage.clear());
    await login(page, "groom8@e2e.test", "Newer-pass-456");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("delete account: wrong password, cancel, then delete for real", async ({ page }) => {
    const email = "bride5@e2e.test";
    await login(page, email);
    await page.goto("/account");
    await page.getByRole("button", { name: "Delete my account" }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByLabel("Password").fill("nope-nope-1");
    await dialog.getByRole("button", { name: "Delete forever" }).click();
    await expect(dialog.getByText("Password is incorrect.")).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: "Delete my account" }).click();
    await dialog.getByLabel("Password").fill(PASSWORD);
    await dialog.getByRole("button", { name: "Delete forever" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect.poll(() => emailsTo(email).some((m) => /account has been deleted/.test(m.subject))).toBe(true);

    // the account is really gone
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
