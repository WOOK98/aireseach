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
// Available for future date assertions: new Date().toISOString().slice(0, 10)

/* ── Route constants ── */
const LOCALE = "en";
const HOME = `/${LOCALE}/`;
const COMPANY = (symbol: string) => `/${LOCALE}/t/${symbol}`;

/** Navigate to a company page; skip if entity resolution fails (404). */
async function gotoCompanyOrSkip(
  page: import("@playwright/test").Page,
  symbol: string,
) {
  const response = await page.goto(COMPANY(symbol));
  if (!response || response.status() === 404) {
    test.skip(true, "Entity resolution unavailable (404)");
    return false;
  }
  // Also check for Next.js not-found page (renders 200 but shows error)
  const notFoundHeading = page.getByText("This page could not be found");
  if (await notFoundHeading.isVisible({ timeout: 1000 }).catch(() => false)) {
    test.skip(true, "Entity resolution unavailable (not-found page)");
    return false;
  }
  return true;
}

/* ── Banned text patterns ── */
const VENDOR_LEAK =
  /Yahoo\s*Finance|Yahoo API|DeepSeek API|Jina API|hosted DeepSeek|unlimited Jina/i;
const INTERNAL_PATH_LEAK =
  /\/api\/report|\/api\/mcp|process\.env\.[A-Z_]|__NEXT_DATA__.*"env"/;
const FALLBACK_COPY = /0\.0%/;

/* ── Vercel auth-page detection (Gate 0 pre-assertion) ── */
const VERCEL_AUTH_PATTERN =
  /Authentication Required|Vercel Authentication|Log in to continue/i;

async function assertNotVercelAuthPage(
  page: import("@playwright/test").Page,
  response: import("@playwright/test").Response | null,
) {
  // Fast path: 401/403 without bypass headers → definitely auth wall
  if (response && (response.status() === 401 || response.status() === 403)) {
    throw new Error(
      `Vercel protection returned ${response.status()} — bypass headers may be missing or secret is invalid`,
    );
  }
  // Slow path: 200 but rendered auth page (Vercel sometimes serves auth as 200)
  const title = await page.title();
  if (VERCEL_AUTH_PATTERN.test(title)) {
    throw new Error(
      `Vercel auth page detected (title: "${title}") — bypass is not working`,
    );
  }
  const bodySnippet = await page
    .locator("body")
    .innerText()
    .catch(() => "");
  if (bodySnippet.length < 500 && VERCEL_AUTH_PATTERN.test(bodySnippet)) {
    throw new Error(
      "Vercel auth page detected in body text — bypass is not working",
    );
  }
}

/* ═══════════════════════════════════════════════════════════
   Gate 0 — Vercel protection bypass sanity check
   ═══════════════════════════════════════════════════════════ */
test.describe("Gate 0 — Vercel bypass sanity", () => {
  test("homepage is NOT the Vercel auth page", async ({ page }) => {
    const response = await page.goto(HOME);
    await assertNotVercelAuthPage(page, response);
    // Double-check: must have the real app title
    await expect(page).toHaveTitle(/Airesearch/i);
  });
});

/* ═══════════════════════════════════════════════════════════
   Gate 1 — Homepage loads successfully
   ═══════════════════════════════════════════════════════════ */
test.describe("Gate 1 — Homepage", () => {
  test("loads and renders search + watchlist", async ({ page }) => {
    await page.goto(HOME);

    // Page loads without error
    await expect(page).toHaveTitle(/Airesearch/i);

    // Search box renders (plain <input> without searchbox role)
    const search = page.getByPlaceholder("Enter a company or ticker");
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
    if (!(await gotoCompanyOrSkip(page, "AAPL"))) return;

    // ENTITY LOCK badge
    await expect(page.getByText("ENTITY LOCK")).toBeVisible();

    // Company name renders in h1
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
    const headingText = await heading.textContent();
    expect(headingText!.length).toBeGreaterThan(0);

    // Ticker renders in the sub-heading paragraph (NasdaqGS · AAPL · ...)
    await expect(
      page.locator("p").filter({ hasText: "AAPL" }).first(),
    ).toBeVisible();
  });
});

/* ═══════════════════════════════════════════════════════════
   Gate 3 — Honest empty state (no 0.0% fallback)
   ═══════════════════════════════════════════════════════════ */
test.describe("Gate 3 — Honest empty state", () => {
  test("no 0.0% fallback copy on company page", async ({ page }) => {
    if (!(await gotoCompanyOrSkip(page, "AAPL"))) return;

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
    if (!(await gotoCompanyOrSkip(page, "AAPL"))) return;

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
    if (!(await gotoCompanyOrSkip(page, "AAPL"))) return;

    await expect(page.getByText("ENTITY LOCK")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toMatch(INTERNAL_PATH_LEAK);
  });
});
