import { describe, expect, it } from "vitest";

import { sanitizeFinancialMetrics } from "../financial-sanitizer";

import type { FinancialMetrics } from "@workspace/shared/types/report";

// ─── Base fixture (healthy single-currency US stock, e.g., AAPL) ─────────────

const healthyUS: FinancialMetrics = {
  ticker: "AAPL",
  companyName: "Apple Inc.",
  exchange: "NasdaqGS",
  sector: "Technology",
  industry: "Consumer Electronics",
  description: "Apple designs consumer electronics.",
  currentPrice: 195.5,
  marketCap: 3_000_000_000_000,
  currency: "USD",
  financialCurrency: "USD",
  priceChange: 2.3,
  priceChangePercent: 1.2,
  marketState: "REGULAR",
  revenue: 394_000_000_000,
  revenueGrowthYoy: 5.2,
  grossProfit: 170_000_000_000,
  grossMargin: 43.1,
  operatingIncome: 114_000_000_000,
  operatingMargin: 28.9,
  netIncome: 97_000_000_000,
  netMargin: 24.6,
  ebitda: 130_000_000_000,
  eps: 6.42,
  epsGrowthYoy: 10.5,
  totalCash: 65_000_000_000,
  totalDebt: 105_000_000_000,
  netCash: -40_000_000_000,
  peRatio: 30.5,
  forwardPE: 28.2,
  pbRatio: 45.0,
  psRatio: 7.6,
  evEbitda: 23.5,
  freeCashFlow: 110_000_000_000,
  fcfMargin: 27.9,
  revenueHistory: [],
  grossMarginHistory: [],
  operatingMarginHistory: [],
  fcfHistory: [],
};

// ─── SKHY fixture (dual-listed: NasdaqGS quote in USD, financials in KRW) ────

const skhyRaw: FinancialMetrics = {
  ticker: "SKHY",
  companyName: "SK hynix Inc.",
  exchange: "NasdaqGS",
  sector: "Technology",
  industry: "Semiconductors",
  description: "SK hynix manufactures memory semiconductors.",
  currentPrice: 85.2, // USD
  marketCap: 61_500_000_000, // USD (from Yahoo price feed)
  currency: "USD", // quote currency
  financialCurrency: "KRW", // reporting currency
  priceChange: -1.3,
  priceChangePercent: -1.5,
  marketState: "REGULAR",
  revenue: 48_000_000_000_000, // KRW (trillions)
  revenueGrowthYoy: 126.0,
  grossProfit: 21_600_000_000_000, // KRW
  grossMargin: 68.3, // % (valid but close to operating)
  operatingIncome: 22_080_000_000_000, // KRW — BUG: higher than gross profit
  operatingMargin: 71.5, // % — IMPOSSIBLE: > gross margin
  netIncome: 15_360_000_000_000, // KRW
  netMargin: 32.0,
  ebitda: 25_000_000_000_000, // KRW
  eps: 21_000, // KRW — huge number
  epsGrowthYoy: 200.0,
  totalCash: 23_000_000_000_000, // KRW
  totalDebt: 18_000_000_000_000, // KRW
  netCash: 5_000_000_000_000, // KRW
  peRatio: 3.8, // garbage: USD price / KRW earnings
  forwardPE: 3.2, // garbage
  pbRatio: 0.8, // garbage
  psRatio: 1.3, // garbage
  evEbitda: -0.3, // garbage (negative due to mixed currencies)
  freeCashFlow: 25_809_050_000_000, // KRW (~$25.8T KRW displayed as $25.8T USD)
  fcfMargin: 53.8,
  revenueHistory: [],
  grossMarginHistory: [],
  operatingMarginHistory: [],
  fcfHistory: [],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("sanitizeFinancialMetrics", () => {
  // ── Healthy US stock: no changes ─────────────────────────────────────────
  it("passes through healthy single-currency data unchanged", () => {
    const { metrics, report } = sanitizeFinancialMetrics(healthyUS);

    expect(report.withheld).toHaveLength(0);
    expect(report.currencyMismatch).toBe(false);
    expect(metrics.peRatio).toBe(30.5);
    expect(metrics.evEbitda).toBe(23.5);
    expect(metrics.operatingMargin).toBe(28.9);
    expect(metrics.freeCashFlow).toBe(110_000_000_000);
  });

  // ── Impossible margin relationship ──────────────────────────────────────
  it("withholds operatingMargin when it exceeds grossMargin", () => {
    const { metrics, report } = sanitizeFinancialMetrics(skhyRaw);

    expect(report.withheld).toContain("operatingMargin");
    expect(report.reasons.operatingMargin).toMatch(/exceeds gross margin/);
    expect(metrics.operatingMargin).toBeNull();
  });

  // ── Cross-currency derived ratios ───────────────────────────────────────
  it("nullifies cross-currency ratios when quote ≠ financial currency", () => {
    const { metrics, report } = sanitizeFinancialMetrics(skhyRaw);

    expect(report.currencyMismatch).toBe(true);
    expect(report.financialCurrency).toBe("KRW");

    // All cross-currency ratios should be null
    expect(metrics.peRatio).toBeNull();
    expect(metrics.forwardPE).toBeNull();
    expect(metrics.pbRatio).toBeNull();
    expect(metrics.psRatio).toBeNull();
    expect(metrics.evEbitda).toBeNull();

    expect(report.withheld).toContain("peRatio");
    expect(report.withheld).toContain("forwardPE");
    expect(report.withheld).toContain("pbRatio");
    expect(report.withheld).toContain("psRatio");
    expect(report.withheld).toContain("evEbitda");
  });

  // ── Extreme value sentinel ──────────────────────────────────────────────
  it("withholds FCF when it exceeds 50% of market cap", () => {
    const { metrics, report } = sanitizeFinancialMetrics(skhyRaw);

    // FCF is 25.8T KRW but marketCap is 61.5B USD — clearly magnitude error
    expect(report.withheld).toContain("freeCashFlow");
    expect(metrics.freeCashFlow).toBeNull();
  });

  // ── EPS sanity ──────────────────────────────────────────────────────────
  it("withholds EPS when it exceeds 2× current price", () => {
    const { metrics, report } = sanitizeFinancialMetrics(skhyRaw);

    // EPS 21000 KRW vs price 85.2 USD — magnitude error
    expect(report.withheld).toContain("eps");
    expect(metrics.eps).toBeNull();
  });

  // ── Margin bounds ───────────────────────────────────────────────────────
  it("withholds margins outside [-100, 100]", () => {
    const badMargins: FinancialMetrics = {
      ...healthyUS,
      grossMargin: 150.0, // impossible
      netMargin: -120.0, // impossible
    };

    const { metrics, report } = sanitizeFinancialMetrics(badMargins);

    expect(report.withheld).toContain("grossMargin");
    expect(report.withheld).toContain("netMargin");
    expect(metrics.grossMargin).toBeNull();
    expect(metrics.netMargin).toBeNull();
  });

  // ── No false positives on same-currency foreign stocks ──────────────────
  it("does not nullify ratios when quote and financial currency match", () => {
    const sameCurrency: FinancialMetrics = {
      ...skhyRaw,
      currency: "KRW",
      financialCurrency: "KRW",
      // Fix impossible margins for this test
      grossMargin: 45.0,
      operatingMargin: 30.0,
      // Fix extreme values
      freeCashFlow: 5_000_000_000_000, // 5T KRW, reasonable
      eps: 5_000, // KRW, reasonable vs KRW price
      currentPrice: 120_000, // KRW
      marketCap: 90_000_000_000_000, // 90T KRW
      peRatio: 24.0,
      forwardPE: 20.0,
      evEbitda: 12.0,
    };

    const { metrics, report } = sanitizeFinancialMetrics(sameCurrency);

    expect(report.currencyMismatch).toBe(false);
    expect(metrics.peRatio).toBe(24.0);
    expect(metrics.evEbitda).toBe(12.0);
    expect(metrics.operatingMargin).toBe(30.0);
  });

  // ── Skhy comprehensive check ────────────────────────────────────────────
  it("SKHY: produces zero garbage values after sanitization", () => {
    const { metrics, report } = sanitizeFinancialMetrics(skhyRaw);

    // No impossible margin combo — operating margin was nullified because it exceeded gross margin
    expect(metrics.operatingMargin).toBeNull();

    // No cross-currency ratios rendered
    expect(metrics.peRatio).toBeNull();
    expect(metrics.forwardPE).toBeNull();
    expect(metrics.evEbitda).toBeNull();

    // No trillion-scale magnitude errors — FCF should be null, not a huge number
    expect(metrics.freeCashFlow).toBeNull();

    // Withheld fields documented
    expect(report.withheld.length).toBeGreaterThanOrEqual(5);
  });
});
