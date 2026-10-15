import { defineConfig, devices } from "@playwright/test";

// End-to-end suite: a real browser against a throwaway local stack
// (Django API on :8001 with a fresh SQLite DB, Next.js on :3100).
// Run: npm run e2e   (first time: npx playwright install chromium)
const API = "http://localhost:8001";
const WEB = "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.results",
  fullyParallel: false,
  workers: 1, // one shared database; specs build on the seeded accounts
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: WEB,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec/ },
  ],
  webServer: [
    {
      command: "node e2e/backend-server.mjs",
      url: `${API}/healthz`,
      timeout: 180_000,
      reuseExistingServer: !!process.env.E2E_REUSE, // E2E_REUSE=1 while iterating
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      // production build so pages don't compile on first visit mid-test
      command: "npx next build && npx next start -p 3100",
      url: WEB,
      timeout: 600_000,
      reuseExistingServer: !!process.env.E2E_REUSE,
      env: {
        NEXT_PUBLIC_API_BASE_URL: `${API}/api/v1`,
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: "",
        NEXT_PUBLIC_DJANGO_ADMIN_URL: `${API}/admin/`,
        NEXT_DIST_DIR: ".next-e2e",
      },
    },
  ],
});
