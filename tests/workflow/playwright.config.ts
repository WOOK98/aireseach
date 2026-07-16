import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT || 3999);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

/**
 * Loop Gate — Playwright smoke config.
 *
 * CI budget: total smoke suite ≤ 60 s (see loop-gate.yml).
 * Tests run against a local Next.js production build.
 */
export default defineConfig({
  testDir: ".",
  testMatch: "smoke.spec.ts",
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm --filter web start -p ${PORT}`,
    port: PORT,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
});
