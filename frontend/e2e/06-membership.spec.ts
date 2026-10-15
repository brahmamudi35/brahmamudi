import { expect, test } from "@playwright/test";

import { login } from "./helpers";

test.describe("membership: manual UPI / bank payment", () => {
  test("plans, the how-to-pay box, QR, copy buttons and WhatsApp link", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await login(page, "groom7@e2e.test");
    await page.getByRole("link", { name: "Membership" }).click();
    await expect(page).toHaveURL(/\/membership/);
    await expect(page.getByText("Current plan:")).toBeVisible();
    for (const price of ["₹1,450", "₹1,950", "₹2,950"]) await expect(page.getByText(price)).toBeVisible();

    // Upgrade on Silver opens the payment box
    await page.getByRole("button", { name: "Upgrade" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Pay ₹1,450 for Silver")).toBeVisible();
    await expect(dialog.getByAltText("UPI QR code")).toBeVisible();
    await expect(dialog.getByText("brahmamudi36-2@oksbi")).toBeVisible();
    await expect(dialog.getByText("111101000600")).toBeVisible();
    await expect(dialog.getByText("ICIC0001111")).toBeVisible();

    await dialog.getByRole("button", { name: "Copy UPI ID" }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("brahmamudi36-2@oksbi");
    await dialog.getByRole("button", { name: "Copy Account number" }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("111101000600");

    const wa = dialog.getByText(/^WhatsApp \+91/).locator("xpath=ancestor-or-self::a[1]");
    const href = decodeURIComponent((await wa.getAttribute("href")) ?? "");
    expect(href).toContain("https://wa.me/918297111166?text=");
    expect(href).toContain("₹1,450 for the Silver membership");
    expect(href).toContain("Profile number: BM900007");
    expect(href).toContain("Registered email: groom7@e2e.test");

    // close and open Gold: amount follows the plan
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await page.getByRole("button", { name: "Upgrade" }).nth(1).click();
    await expect(page.getByRole("dialog").getByText("Pay ₹1,950 for Gold")).toBeVisible();
  });
});
