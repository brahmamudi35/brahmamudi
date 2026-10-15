import { expect, test } from "@playwright/test";

import { codeAfter, field, login, PASSWORD } from "./helpers";

test.describe("sign in / out / forgot password", () => {
  test("wrong password is rejected, right one signs in", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("groom@e2e.test");
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/no active account|incorrect|invalid/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("login returns you to the page you asked for", async ({ page }) => {
    await page.goto("/interests");
    await expect(page).toHaveURL(/\/login\?next=%2Finterests/);
    await page.getByLabel("Email").fill("groom@e2e.test");
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/interests$/);
  });

  test("sign out from the account menu", async ({ page }) => {
    await login(page, "groom@e2e.test");
    await page.getByRole("button", { name: "Ravi" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/); // home, not the login page
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("forgot password: email → code → new password → sign in", async ({ page }) => {
    const email = "groom9@e2e.test";
    await page.goto("/login");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(page.getByText("Enter your code")).toBeVisible();

    // "use a different email" goes back, then forward again
    await page.getByRole("button", { name: "Use a different email" }).click();
    await page.getByLabel("Email").fill(email);
    const code = await codeAfter(email, "password reset", () =>
      page.getByRole("button", { name: "Send code" }).click(),
    );
    await field(page, "6-digit code").fill(code);
    await field(page, "New password").fill("Brand-new-pw-77");
    await field(page, "Confirm password").fill("Different-pw-88");
    await page.getByRole("button", { name: "Set password" }).click();
    await expect(page.getByText("Passwords don't match.")).toBeVisible();

    await field(page, "Confirm password").fill("Brand-new-pw-77");
    await page.getByRole("button", { name: "Set password" }).click();
    await expect(page.getByText("Password set")).toBeVisible();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    // old password no longer works, new one does
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.getByLabel("Password").fill("Brand-new-pw-77");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
