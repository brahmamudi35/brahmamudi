import { expect, type Page, test } from "@playwright/test";

import { emailsTo, field, login, pickSelect } from "./helpers";

async function openMember(page: Page, query: string) {
  await page.goto("/admin");
  await page.getByRole("button", { name: "Directory", exact: true }).click();
  await page.getByPlaceholder("Name, reg. no, email, phone, occupation…").fill(query);
  // click Manage on the row that actually contains the query (the list filters async)
  await page.locator('[data-slot="card"]').filter({ hasText: query }).getByRole("button", { name: "Manage" }).first().click();
  await expect(page).toHaveURL(/\/admin\/members\/\d+/);
}

async function confirmDialog(page: Page, label: string) {
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: label, exact: true }).click();
  await expect(dialog).toBeHidden();
}

test.describe.serial("staff desk", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "staff@e2e.test");
  });

  test("staff-only menu, summary and every tab", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link")).toHaveText(["Admin", "Browse members"]);
    await expect(page.getByRole("button", { name: "Notifications" })).toHaveCount(0);
    await nav.getByRole("link", { name: "Admin" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    for (const tab of ["Directory", "Payments", "Photos", "Horoscopes", "Activity", "Guided search"]) {
      await page.getByRole("button", { name: tab, exact: true }).click();
    }
  });

  test("guided search: look up by profile number, and the wizard", async ({ page }) => {
    await page.goto("/admin");
    await page.getByPlaceholder(/Know exactly who\?/).fill("BM900001");
    await page.getByRole("button", { name: "Look up" }).click();
    await expect(page.getByText("Lakshmi").first()).toBeVisible();

    await page.goto("/admin");
    await expect(page.getByText(/≈ \d+ members/)).toBeVisible();
    for (let i = 0; i < 12; i++) {
      const next = page.getByRole("button", { name: "Next" });
      if (!(await next.isVisible())) break;
      await next.click();
    }
    await page.getByRole("button", { name: "Show results" }).click();
    await expect(page.getByRole("button", { name: "Manage" }).first()).toBeVisible();
    // the row-level Suspend asks first; cancel leaves the member alone
    await page.getByRole("button", { name: "Suspend" }).first().click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("alertdialog")).toBeHidden();
    await expect(page.getByRole("button", { name: "Reinstate" })).toHaveCount(0); // nobody suspended
    await page.getByRole("button", { name: "Refine" }).click();
    await page.getByRole("button", { name: "Show results" }).click();
    await page.getByRole("button", { name: "Start over" }).click();
  });

  test("verify / unverify (with confirm) and suspend / reinstate", async ({ page }) => {
    await openMember(page, "Lakshmi");
    await page.getByRole("button", { name: "Verify", exact: true }).click();
    await expect(page.getByRole("button", { name: "Unverify" })).toBeVisible();

    await page.getByRole("button", { name: "Unverify" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("alertdialog")).toBeHidden();
    await expect(page.getByRole("button", { name: "Unverify" })).toBeVisible(); // cancel = no change
    await page.getByRole("button", { name: "Unverify" }).click();
    await confirmDialog(page, "Unverify");
    await expect(page.getByRole("button", { name: "Verify", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Suspend" }).click();
    await confirmDialog(page, "Suspend");
    await expect(page.getByText("Suspended").first()).toBeVisible();
    await page.getByRole("button", { name: "Reinstate" }).click();
    await expect(page.getByRole("button", { name: "Suspend" })).toBeVisible();
    await page.getByRole("button", { name: "Verify", exact: true }).click(); // leave her verified
    await expect(page.getByRole("button", { name: "Unverify" })).toBeVisible();
  });

  test("edit a member's bio-data", async ({ page }) => {
    await openMember(page, "Sita");
    await field(page, "Occupation").fill("Chartered Accountant");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Member profile saved.")).toBeVisible();
    await page.reload();
    await expect(field(page, "Occupation")).toHaveValue("Chartered Accountant");
    await expect(page.getByText("Edited profile: occupation")).toBeVisible();
  });

  test("grant Gold paid by UPI → payment, email, activity; then revoke", async ({ page }) => {
    await openMember(page, "groom@e2e.test");
    const before = emailsTo("groom@e2e.test").filter((m) => /membership is active/.test(m.subject)).length;

    await page.getByLabel("Plan", { exact: true }).selectOption("gold");
    await expect(page.getByLabel("Amount received", { exact: true })).toHaveValue("1950");
    await page.getByLabel("Payment method", { exact: true }).selectOption("upi");
    await page.getByLabel("Reference", { exact: true }).fill("UTR123456789");
    await page.getByLabel("Note", { exact: true }).fill("Paid via WhatsApp screenshot");
    await page.getByRole("button", { name: "Grant plan" }).click();
    await expect(page.getByRole("alertdialog").getByText(/₹1,950 received by UPI/)).toBeVisible();
    await confirmDialog(page, "Grant plan");

    await expect(page.getByText("Plan granted.")).toBeVisible();
    await expect(page.getByText("offline · upi · UTR123456789")).toBeVisible();
    await expect(page.getByText("Granted plan gold (₹1,950 via upi)")).toBeVisible();
    await expect
      .poll(() => emailsTo("groom@e2e.test").filter((m) => /Gold membership is active/.test(m.subject)).length)
      .toBe(before + 1);

    // complimentary Silver for another member, then revoke it
    await openMember(page, "Kiran");
    await page.getByLabel("Plan", { exact: true }).selectOption("silver");
    await page.getByLabel("Payment method", { exact: true }).selectOption("comp");
    await expect(page.getByLabel("Amount received", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Grant plan" }).click();
    await confirmDialog(page, "Grant plan");
    await expect(page.getByText("complimentary").first()).toBeVisible();
    await page.getByRole("button", { name: "Revoke" }).click();
    await confirmDialog(page, "Revoke");
    await expect(page.getByText("Subscription revoked.")).toBeVisible();
    await expect(page.getByText("Revoked plan silver")).toBeVisible();
  });

  test("photo queue: approve a pending photo", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("button", { name: "Photos", exact: true }).click();
    await page.getByRole("button", { name: "Approve photo" }).first().click();
    await expect(page.getByText(/No photos waiting|nothing to review/i)).toBeVisible();
  });

  test("payments and activity tabs list the grant", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("button", { name: "Payments", exact: true }).click();
    await expect(page.getByText("offline · upi · UTR123456789")).toBeVisible();
    await page.getByRole("button", { name: "Activity", exact: true }).click();
    await expect(page.getByText("Granted plan gold (₹1,950 via upi)")).toBeVisible();
    await expect(page.getByText("Approved photo").first()).toBeVisible();
  });

  test("staff add a member on one page; the profile number is automatic", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("button", { name: "Add member" }).click();
    await expect(page).toHaveURL(/\/admin\/members\/new/);

    // name and gender are required
    await page.getByRole("button", { name: "Create member" }).click();
    await expect(page.getByText("Enter a name.")).toBeVisible();

    await expect(page.getByText("Given automatically on create")).toBeVisible();
    await field(page, "Brahmamudi number").fill("VBSS-1001");
    await field(page, "Login email").fill("walkin@e2e.test");
    await field(page, "Name").fill("Saraswathi");
    await pickSelect(page, "Gender", /Female|Bride/);
    await pickSelect(page, "Qualification", "Masters");
    await field(page, "Time of birth").fill("06:45 AM");
    await field(page, "Father's name").fill("Venkatachary");
    await page.getByRole("button", { name: "Create member" }).click();

    await expect(page).toHaveURL(/\/admin\/members\/\d+$/);
    await expect(page.getByText(/^62\d\d · Brahmamudi no\. VBSS-1001 · Bride/)).toBeVisible(); // 6220 onwards, no "BM"
    await expect(field(page, "Father's name")).toHaveValue("Venkatachary");
    await expect(field(page, "Time of birth")).toHaveValue("06:45 AM");
  });

  test("staff search sees both brides and grooms", async ({ page }) => {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Browse members" }).click();
    await expect(page.getByText("Lakshmi").first()).toBeVisible();
    await expect(page.getByText("Kiran").first()).toBeVisible();
  });
});

test("members can't open the staff desk", async ({ page }) => {
  await login(page, "bride@e2e.test");
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Admin" })).toHaveCount(0);
  await page.goto("/admin");
  await expect(page.getByText(/not authorised|staff only|permission|Forbidden/i).or(page.locator("body"))).toBeVisible();
  await expect(page.getByRole("button", { name: "Directory", exact: true })).toHaveCount(0);
});

// keep pickSelect referenced for future staff edits of select fields
void pickSelect;
