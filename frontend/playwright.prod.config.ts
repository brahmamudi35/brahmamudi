import { defineConfig, devices } from "@playwright/test";

// Read-only smoke test of the LIVE site: npx playwright test -c playwright.prod.config.ts
// (see e2e-prod/prod-smoke.spec.ts for the env vars it needs).
export default defineConfig({
  testDir: "./e2e-prod",
  outputDir: "./e2e-prod/.results",
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: { baseURL: "https://brahmamudi.com", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "live", use: { ...devices["Desktop Chrome"] } }],
});
