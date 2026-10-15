import { expect, test } from "@playwright/test";

import { login } from "./helpers";

test.describe("phone layout", () => {
  test("member: menu button opens the member menu", async ({ page }) => {
    await login(page, "groom7@e2e.test");
    await page.getByRole("button", { name: "Menu" }).click();
    const nav = page.getByRole("navigation", { name: "Mobile" });
    await expect(nav.getByRole("link")).toHaveText([
      "Matches", "Search", "Interests", "Shortlist", "Visitors", "Saved", "Membership",
    ]);
    await nav.getByRole("link", { name: "Interests" }).click();
    await expect(page).toHaveURL(/\/interests/);
  });

  test("staff: menu shows Admin + Browse members", async ({ page }) => {
    await login(page, "staff@e2e.test");
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.getByRole("navigation", { name: "Mobile" }).getByRole("link")).toHaveText([
      "Admin",
      "Browse members",
    ]);
  });

  test("payment box offers tap-to-pay on a phone", async ({ page }) => {
    await login(page, "groom7@e2e.test");
    await page.goto("/membership");
    await page.getByRole("button", { name: "Upgrade" }).first().click();
    const pay = page.getByText("Pay ₹1,450 with a UPI app").locator("xpath=ancestor-or-self::a[1]");
    await expect(pay).toBeVisible();
    const href = (await pay.getAttribute("href")) ?? "";
    expect(href).toMatch(/^upi:\/\/pay\?pa=brahmamudi36-2@oksbi&pn=brahma%20mudi&am=1450\.00&cu=INR/);
  });

  test("public pages fit the screen (no sideways scroll)", async ({ page }) => {
    for (const path of ["/", "/pricing", "/about", "/contact", "/terms", "/privacy", "/refund-policy", "/login", "/register"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(1);
    }
  });
});
