import { expect, test } from "@playwright/test";

import { API, login, PASSWORD } from "./helpers";

test.describe("super admin", () => {
  test("super admin uses the staff desk", async ({ page }) => {
    await login(page, "super@e2e.test");
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link")).toHaveText([
      "Admin",
      "Browse members",
    ]);
    await page.goto("/admin");
    await expect(page.getByRole("button", { name: "Directory", exact: true })).toBeVisible();
  });

  test("Django admin: superuser gets in, staff does not", async ({ page }) => {
    for (const [email, allowed] of [
      ["super@e2e.test", true],
      ["staff@e2e.test", false],
    ] as const) {
      await page.context().clearCookies();
      await page.goto(`${API}/admin/login/`);
      await page.locator("#id_username").fill(email);
      await page.locator("#id_password").fill(PASSWORD);
      await page.locator('input[type="submit"]').click();
      if (allowed) {
        await expect(page.getByText(/Site administration|brahmamudi/i).first()).toBeVisible();
        await expect(page.getByRole("link", { name: "Staff actions" })).toBeVisible();
      } else {
        await expect(page).toHaveURL(/\/admin\/login\//);
      }
    }
  });
});
