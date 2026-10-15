import { expect, test } from "@playwright/test";

import { login } from "./helpers";

test.describe("member browsing (groom)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "groom@e2e.test");
  });

  test("dashboard shows completeness and the matches strip", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/% complete/)).toBeVisible();
    await expect(page.getByText("Matches for you")).toBeVisible();
  });

  test("matches page lists brides only", async ({ page }) => {
    await page.getByRole("link", { name: "Matches" }).first().click();
    await expect(page).toHaveURL(/\/matches/);
    // seed gives the groom a star that porutham-matches Divya and Anjali
    await expect(page.getByText(/Divya|Anjali/).first()).toBeVisible();
    await expect(page.getByText("Kiran")).toHaveCount(0); // another groom
  });

  test("search: keyword filter, clear, open a profile", async ({ page }) => {
    await page.getByRole("link", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByText("Sita").first()).toBeVisible();
    await expect(page.getByText("Kiran")).toHaveCount(0);

    await page.getByPlaceholder(/Name, profile number/).first().fill("Padma");
    await expect(page.getByText("Padma").first()).toBeVisible();
    await expect(page.getByText("Sita")).toHaveCount(0);

    await page.getByRole("button", { name: /^Clear( filters)?$/ }).first().click();
    await expect(page.getByText("Sita").first()).toBeVisible();

    // profile number search
    await page.getByPlaceholder(/Name, profile number/).first().fill("BM900001");
    await expect(page.getByText("Lakshmi").first()).toBeVisible();
    await page.getByText("Lakshmi").first().click();
    await expect(page).toHaveURL(/\/profiles\/\d+/);
    await expect(page.getByText("Lakshmi").first()).toBeVisible();
  });

  test("profile: porutham, shortlist, locked contact → membership", async ({ page }) => {
    await page.goto("/search");
    await page.getByPlaceholder(/Name, profile number/).first().fill("Anjali");
    await page.getByText("Anjali").first().click();
    await expect(page).toHaveURL(/\/profiles\/\d+/);

    await expect(page.getByText(/porutham/i).first()).toBeVisible();
    await expect(page.getByText("Hidden until you unlock this profile.")).toBeVisible();

    await page.getByRole("button", { name: "Add to shortlist" }).click();
    await expect(page.getByRole("button", { name: "Shortlisted" })).toBeVisible();
    await page.goto("/shortlist");
    await expect(page.getByText("Anjali").first()).toBeVisible();
    await page.getByText("Anjali").first().click();
    await page.getByRole("button", { name: "Shortlisted" }).click();
    await expect(page.getByRole("button", { name: "Add to shortlist" })).toBeVisible();
    await page.goto("/shortlist");
    await expect(page.getByText("Your shortlist is empty.")).toBeVisible();

    // free plan: unlocking contact sends you to Membership
    await page.goBack();
    await page.goto("/search");
    await page.getByPlaceholder(/Name, profile number/).first().fill("Anjali");
    await page.getByText("Anjali").first().click();
    await page.getByRole("button", { name: "Unlock contact" }).click();
    await expect(page).toHaveURL(/\/membership/);
  });

  test("saved search: save, list, view results, delete", async ({ page }) => {
    await page.goto("/search");
    await page.getByPlaceholder(/Name, profile number/).first().fill("Divya");
    await expect(page.getByText("Divya").first()).toBeVisible();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("dialog").getByRole("textbox").first().fill("Divya search");
    await page.getByRole("dialog").getByRole("button", { name: /^Save( search)?$/ }).click();

    await page.getByRole("link", { name: "Saved" }).click();
    await expect(page).toHaveURL(/\/saved-searches/);
    await expect(page.getByText("Divya search")).toBeVisible();
    await page.getByRole("button", { name: "View results" }).first().click();
    await expect(page.getByText("Divya").first()).toBeVisible();

    await page.goto("/saved-searches");
    await page.getByRole("button", { name: "Delete saved search Divya search" }).click();
    await expect(page.getByText("No saved searches yet.")).toBeVisible();
  });
});
