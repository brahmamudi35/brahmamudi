import { expect, type Page, test } from "@playwright/test";

import { login, logout } from "./helpers";

async function openProfile(page: Page, name: string) {
  await page.goto("/search");
  await page.getByPlaceholder(/Name, profile number/).first().fill(name);
  await page.getByText(name).first().click();
  await expect(page).toHaveURL(/\/profiles\/\d+/);
}

async function sendInterest(page: Page, to: string, note?: string) {
  await openProfile(page, to);
  await page.getByRole("button", { name: /Express interest|Send interest/ }).first().click();
  const dialog = page.getByRole("dialog");
  if (note) await dialog.getByPlaceholder("Add a personal note (optional)").fill(note);
  await dialog.getByRole("button", { name: "Send interest" }).click();
  await expect(dialog).toBeHidden();
}

test.describe.serial("interests between members", () => {
  test("groom sends an interest; bride is notified and accepts", async ({ page }) => {
    await login(page, "groom@e2e.test");
    await sendInterest(page, "Lakshmi", "Namaste, our families would like to talk.");
    await page.goto("/interests");
    await page.getByRole("tab", { name: "Sent" }).click();
    await expect(page.getByText("Lakshmi").first()).toBeVisible();

    await logout(page);
    await login(page, "bride@e2e.test");
    // bell shows an unread notification
    await page.getByRole("button", { name: "Notifications" }).click();
    await expect(page.getByText(/Ravi/).first()).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto("/interests");
    await page.getByRole("tab", { name: "Received" }).click();
    await expect(page.getByText("Ravi").first()).toBeVisible();
    await expect(page.getByText("Namaste, our families would like to talk.")).toBeVisible();
    await page.getByRole("button", { name: "Accept" }).first().click();
    await expect(page.getByText(/accepted/i).first()).toBeVisible();

    // the bride viewed his profile → he gets a visitor
    await openProfile(page, "Ravi");
  });

  test("groom sees the acceptance and the visitor", async ({ page }) => {
    await login(page, "groom@e2e.test");
    await page.goto("/notifications");
    await expect(page.getByText(/accepted/i).first()).toBeVisible();
    await page.getByRole("button", { name: "Mark all read" }).click();

    await page.getByRole("link", { name: "Visitors" }).click();
    await expect(page).toHaveURL(/\/visitors/);
    await expect(page.getByText("Lakshmi").first()).toBeVisible();
  });

  test("withdraw a sent interest", async ({ page }) => {
    await login(page, "groom@e2e.test");
    await sendInterest(page, "Sita");
    await page.goto("/interests");
    await page.getByRole("tab", { name: "Sent" }).click();
    const sitaRow = page.getByRole("tabpanel").locator("div").filter({ hasText: "Sita" }).filter({
      has: page.getByRole("button", { name: "Withdraw" }),
    }).last();
    await sitaRow.getByRole("button", { name: "Withdraw" }).click();
    const confirm = page.getByRole("alertdialog");
    if (await confirm.isVisible().catch(() => false)) await confirm.getByRole("button", { name: /Withdraw/ }).click();
    await expect(page.getByText(/withdrawn/i).first()).toBeVisible();
  });

  test("a bride declines an interest", async ({ page }) => {
    await login(page, "groom7@e2e.test");
    await sendInterest(page, "Padma");
    await logout(page);
    await login(page, "bride4@e2e.test");
    await page.goto("/interests");
    await page.getByRole("tab", { name: "Received" }).click();
    await page.getByRole("button", { name: "Decline" }).first().click();
    await expect(page.getByText(/declined/i).first()).toBeVisible();
  });
});
