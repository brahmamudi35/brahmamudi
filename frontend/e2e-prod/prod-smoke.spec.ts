// READ-ONLY checks against the live site. Never registers, sends interests,
// saves, grants or deletes anything. Credentials come from env:
// PROD_MEMBER_EMAIL / PROD_MEMBER_PW (test groom), PROD_STAFF_EMAIL / PROD_STAFF_PW.
import { expect, test } from "@playwright/test";

const member = { email: process.env.PROD_MEMBER_EMAIL ?? "", pw: process.env.PROD_MEMBER_PW ?? "" };
const staff = { email: process.env.PROD_STAFF_EMAIL ?? "", pw: process.env.PROD_STAFF_PW ?? "" };

async function signIn(page: import("@playwright/test").Page, email: string, pw: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(pw);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

test("public pages and links", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Register free" }).first()).toBeVisible();
  for (const [link, h1] of [["About", /About brahmamudi/], ["Pricing", /Plans & pricing/], ["Contact", /Contact us/],
    ["Terms", /Terms of service/], ["Privacy", /Privacy policy/], ["Refund policy", /Refund & cancellation/]] as const) {
    await page.goto("/");
    await page.locator("footer").getByRole("link", { name: link, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(h1);
  }
  await page.goto("/pricing");
  for (const p of ["₹1,450", "₹1,950", "₹2,950"]) await expect(page.getByText(p)).toBeVisible();
});

test("member: menus, search, profile, payment box (no actions)", async ({ page }) => {
  test.skip(!member.email, "PROD_MEMBER_EMAIL not set");
  await signIn(page, member.email, member.pw);
  await expect(page).toHaveURL(/\/dashboard/);
  for (const [name, path] of [["Matches", /\/matches/], ["Search", /\/search/], ["Interests", /\/interests/],
    ["Shortlist", /\/shortlist/], ["Visitors", /\/visitors/], ["Saved", /\/saved-searches/], ["Membership", /\/membership/]] as const) {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(path);
  }
  await page.goto("/search");
  await page.locator("a[href^='/profiles/']").first().click();
  await expect(page).toHaveURL(/\/profiles\/\d+/);
  await expect(page.getByText(/porutham/i).first()).toBeVisible();

  await page.goto("/membership");
  await page.getByRole("button", { name: "Upgrade" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/Pay ₹1,450 for Silver/)).toBeVisible();
  await expect(dialog.getByAltText("UPI QR code")).toBeVisible();
  await expect(dialog.getByText("brahmamudi36-2@oksbi")).toBeVisible();
  await page.keyboard.press("Escape");

  // sign out lands on the home page (fixed today)
  await page.getByRole("button", { name: /^(Rahul|Ravi|Test)/ }).first().click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/brahmamudi\.com\/$/);
});

test("staff: staff menu and every admin tab (view only)", async ({ page }) => {
  test.skip(!staff.email, "PROD_STAFF_EMAIL not set");
  await signIn(page, staff.email, staff.pw);
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link")).toHaveText(["Admin", "Browse members"]);
  await nav.getByRole("link", { name: "Admin" }).click();
  for (const tab of ["Directory", "Payments", "Photos", "Horoscopes", "Activity", "Guided search"]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
  }
  await page.getByRole("button", { name: "Directory", exact: true }).click();
  await page.getByRole("button", { name: "Manage" }).first().click();
  await expect(page).toHaveURL(/\/admin\/members\/\d+/);
  await expect(page.getByText("Activity").first()).toBeVisible();
  // the date of birth is loaded into the edit form now (the bug fixed today)
  await expect(page.getByLabel(/^Date of birth/)).not.toHaveValue("");
});
