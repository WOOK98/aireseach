/* oxlint-disable turbo/no-undeclared-env-vars */
import { defineConfig, devices } from "@playwright/test";

declare const process: { env: Record<string, string | undefined> };

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
    command: `env SKIP_ENV_VALIDATION=1 DATABASE_URL=postgresql://localhost:5432/test CONTACT_EMAIL=test@example.com pnpm --filter web start -p ${PORT}`,
    port: PORT,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
});
