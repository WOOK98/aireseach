/* oxlint-disable turbo/no-undeclared-env-vars */
import { defineConfig, devices } from "@playwright/test";

declare const process: { env: Record<string, string | undefined> };

const PORT = Number(process.env.PORT || 3999);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

/**
 * Loop Gate — Playwright smoke config.
 *
 * CI budget: total smoke suite ≤ 60 s (see loop-gate.yml).
 *
 * When BASE_URL is set (e.g. Vercel preview), tests run against that URL
 * directly — no local server needed. Otherwise, a local Next.js production
 * build is started on PORT.
 */
export default defineConfig({
  testDir: ".",
  testMatch: "smoke.spec.ts",
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    // Vercel Protection Bypass for Automation — inject bypass headers
    // only when the secret is available (CI preview deploys).
    ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? {
          extraHTTPHeaders: {
            "x-vercel-protection-bypass":
              process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
            "x-vercel-set-bypass-cookie": "true",
          },
        }
      : {}),
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Only start a local server when BASE_URL is not provided.
  ...(process.env.BASE_URL
    ? {}
    : {
        webServer: {
          command: `pnpm --filter web start -p ${PORT}`,
          port: PORT,
          timeout: 60_000,
          reuseExistingServer: !process.env.CI,
        },
      }),
});
