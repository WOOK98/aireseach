import { test, expect } from "@playwright/test";

/**
 * Loop Gate — Playwright smoke tests (五闸).
 *
 * Tests ONLY existing functionality. Phase C (301 redirects for old modules)
 * is not implemented yet → not tested here.
 *
 * Redlines:
 *  - No anticipatory tests for unbuilt features.
 *  - Date assertions use ISO fixtures (see AS_OF below).
 *  - Test fixtures are isolated from product code.
 *  - No --no-verify in any script.
 */

/* ── ISO date fixture for any date-related assertions ── */
const AS_OF = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

/* ── Route constants ── */
const LOCALE = process.env.TEST_LOCALE || "en";
const HOME = `/${LOCALE}/`;
const COMPANY = (symbol: string) => `/${LOCALE}/t/${symbol}`;

/* ── Banned text patterns ── */
const VENDOR_LEAK =
  /Yahoo\s*Finance|Yahoo API|DeepSeek API|Jina API|hosted DeepSeek|unlimited Jina/i;
const INTERNAL_PATH_LEAK =
  /\/api\/report|\/api\/mcp|process\.env\.[A-Z_]|__NEXT_DATA__.*"env"/;
const FALLBACK_COPY = /0\.0%/;

/* ═══════════════════════════════════════════════════════════
   Gate 1 — Homepage loads successfully
   ═══════════════════════════════════════════════════════════ */
test.describe("Gate 1 — Homepage", () => {
  test("loads and renders search + watchlist", async ({ page }) => {
    await page.goto(HOME);

    // Page loads without error
    await expect(page).toHaveTitle(/Airesearch/i);

    // Search box renders
    const search = page.getByRole("searchbox");
    await expect(search).toBeVisible();

    // Watchlist badges section renders
    // Homepage has a flex-wrap container with watchlist badge links
    await expect(page.locator("div.flex.flex-wrap").first()).toBeAttached();
  });
});

/* ═══════════════════════════════════════════════════════════
   Gate 2 — /t/[symbol] renders ENTITY LOCK header
   ═══════════════════════════════════════════════════════════ */
test.describe("Gate 2 — Company page", () => {
  test("renders ENTITY LOCK for a known symbol", async ({ page }) => {
    const response = await page.goto(COMPANY("AAPL"));

    // If entity resolution fails (e.g. Yahoo Finance unreachable in CI),
    // the page returns 404. Skip gracefully rather than flake.
    if (!response || response.status() === 404) {
      test.skip(true, "Entity resolution unavailable — skipping Gate 2");
      return;
    }

    // ENTITY LOCK badge
    await expect(page.getByText("ENTITY LOCK")).toBeVisible();

    // Company name renders in h1
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
    const headingText = await heading.textContent();
    expect(headingText!.length).toBeGreaterThan(0);

    // Ticker renders in the sub-heading area
    await expect(page.getByText("AAPL")).toBeVisible();
  });
});

/* ═══════════════════════════════════════════════════════════
   Gate 3 — Honest empty state (no 0.0% fallback)
   ═══════════════════════════════════════════════════════════ */
test.describe("Gate 3 — Honest empty state", () => {
  test("no 0.0% fallback copy on company page", async ({ page }) => {
    const response = await page.goto(COMPANY("AAPL"));

    if (!response || response.status() === 404) {
      test.skip(true, "Entity resolution unavailable — skipping Gate 3");
      return;
    }

    await expect(page.getByText("ENTITY LOCK")).toBeVisible();

    // Assert the page does NOT contain 0.0% fallback copy
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toMatch(FALLBACK_COPY);
  });
});

/* ═══════════════════════════════════════════════════════════
   Gate 4 — No vendor/provider name leakage
   ═══════════════════════════════════════════════════════════ */
test.describe("Gate 4 — No vendor leakage", () => {
  test("homepage has no vendor names", async ({ page }) => {
    await page.goto(HOME);
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toMatch(VENDOR_LEAK);
  });

  test("company page has no vendor names", async ({ page }) => {
    const response = await page.goto(COMPANY("AAPL"));

    if (!response || response.status() === 404) {
      test.skip(true, "Entity resolution unavailable — skipping Gate 4 (company)");
      return;
    }

    await expect(page.getByText("ENTITY LOCK")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toMatch(VENDOR_LEAK);
  });
});

/* ═══════════════════════════════════════════════════════════
   Gate 5 — No internal path / env leakage
   ═══════════════════════════════════════════════════════════ */
test.describe("Gate 5 — No internal path leakage", () => {
  test("homepage has no internal paths", async ({ page }) => {
    await page.goto(HOME);
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toMatch(INTERNAL_PATH_LEAK);
  });

  test("company page has no internal paths", async ({ page }) => {
    const response = await page.goto(COMPANY("AAPL"));

    if (!response || response.status() === 404) {
      test.skip(true, "Entity resolution unavailable — skipping Gate 5 (company)");
      return;
    }

    await expect(page.getByText("ENTITY LOCK")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toMatch(INTERNAL_PATH_LEAK);
  });
});
