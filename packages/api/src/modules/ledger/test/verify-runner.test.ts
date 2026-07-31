/**
 * L3 Ledger Verification Runner — Unit Tests
 *
 * Tests verifyJudgment() pure function covering all four states:
 *   - confirmed: data fetchable + wrongIf NOT triggered
 *   - invalidated: data fetchable + wrongIf triggered
 *   - needs_manual_review: wrongIf not machine-verifiable OR metric unextractable
 *   - insufficient_data: handled at runner level (API failure)
 *
 * Redline: NEVER auto-confirm when data is missing or wrongIf is unparseable.
 */

import { describe, it, expect } from "vitest";

import { verifyJudgment } from "../verifier";

import type { FinancialMetrics } from "@workspace/shared/types/report";

// ── Stub metrics ────────────────────────────────────────────────────────────

const STUB_METRICS = {
  ticker: "AAPL",
  companyName: "Apple",
  exchange: "NASDAQ",
  sector: "Technology",
  industry: "Consumer Electronics",
  description: "",
  currentPrice: 150,
  marketCap: 2.5e12,
  currency: "USD",
  marketState: "REGULAR",
  priceChange: 1.5,
  priceChangePercent: 1.0,
  revenue: 394e9,
  revenueGrowthYoy: 8.5,
  grossProfit: 170e9,
  grossMargin: 43.3,
  operatingIncome: 114e9,
  operatingMargin: 28.9,
  netIncome: 97e9,
  netMargin: 24.6,
  ebitda: 130e9,
  eps: 6.15,
  epsGrowthYoy: 12.0,
  totalCash: 62e9,
  totalDebt: 108e9,
  netCash: null,
  peRatio: 24.4,
  pbRatio: 39.0,
  psRatio: 6.4,
  evEbitda: 19.5,
  freeCashFlow: 110e9,
  fcfMargin: 27.9,
  revenueHistory: [],
  grossMarginHistory: [],
} as unknown as FinancialMetrics;

// ── Helper ──────────────────────────────────────────────────────────────────

function makeJudgment(
  overrides: Partial<{
    id: string;
    ticker: string;
    judgment: string;
    keyNumber: string;
    wrongIf: string;
    metric: string | null;
    trigger: string | null;
  }> = {},
) {
  return {
    id: "j1",
    ticker: "AAPL",
    judgment: "test judgment",
    keyNumber: "Gross Margin 43.3%",
    wrongIf: "Gross margin falls below 35%",
    metric: "grossMargin",
    trigger: "<35%",
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// verifyJudgment — confirmed
// ═══════════════════════════════════════════════════════════════════════════════

describe("verifyJudgment — confirmed", () => {
  it("returns confirmed when wrongIf condition is NOT triggered", () => {
    const result = verifyJudgment(
      makeJudgment({
        wrongIf: "Gross margin falls below 35%",
        metric: "grossMargin",
      }),
      STUB_METRICS,
    );
    expect(result.result).toBe("confirmed");
    expect(result.dataPoint).toContain("grossMargin");
    expect(result.notes).toContain("NOT triggered");
  });

  it("returns confirmed for revenue growth above threshold", () => {
    const result = verifyJudgment(
      makeJudgment({
        wrongIf: "Revenue growth drops below 5%",
        metric: "revenueGrowthYoy",
      }),
      STUB_METRICS,
    );
    expect(result.result).toBe("confirmed");
  });

  it("returns confirmed for P/E below threshold", () => {
    const result = verifyJudgment(
      makeJudgment({ wrongIf: "P/E exceeds 30x", metric: "peRatio" }),
      STUB_METRICS,
    );
    expect(result.result).toBe("confirmed");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// verifyJudgment — invalidated
// ═══════════════════════════════════════════════════════════════════════════════

describe("verifyJudgment — invalidated", () => {
  it("returns invalidated when wrongIf condition IS triggered", () => {
    const metrics = { ...STUB_METRICS, grossMargin: 30 };
    const result = verifyJudgment(
      makeJudgment({
        wrongIf: "Gross margin falls below 35%",
        metric: "grossMargin",
      }),
      metrics,
    );
    expect(result.result).toBe("invalidated");
    expect(result.notes).toContain("triggered");
  });

  it("returns invalidated for revenue growth below threshold", () => {
    const metrics = { ...STUB_METRICS, revenueGrowthYoy: 3 };
    const result = verifyJudgment(
      makeJudgment({
        wrongIf: "Revenue growth drops below 5%",
        metric: "revenueGrowthYoy",
      }),
      metrics,
    );
    expect(result.result).toBe("invalidated");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// verifyJudgment — needs_manual_review
// ═══════════════════════════════════════════════════════════════════════════════

describe("verifyJudgment — needs_manual_review", () => {
  it("returns needs_manual_review for qualitative wrongIf", () => {
    const result = verifyJudgment(
      makeJudgment({ wrongIf: "Management loses confidence", metric: null }),
      STUB_METRICS,
    );
    expect(result.result).toBe("needs_manual_review");
    expect(result.notes).toContain("cannot be automatically evaluated");
  });

  it("returns needs_manual_review for event-based wrongIf", () => {
    const result = verifyJudgment(
      makeJudgment({ wrongIf: "Key customer churns", metric: null }),
      STUB_METRICS,
    );
    expect(result.result).toBe("needs_manual_review");
  });

  it("returns needs_manual_review when metric not extractable", () => {
    const result = verifyJudgment(
      makeJudgment({
        wrongIf: "Something drops below 10%",
        metric: "nonexistentMetric",
      }),
      STUB_METRICS,
    );
    expect(result.result).toBe("needs_manual_review");
  });

  it("returns needs_manual_review for unparseable wrongIf with valid metric", () => {
    const result = verifyJudgment(
      makeJudgment({
        wrongIf: "significant deterioration in competitive position",
        metric: "grossMargin",
      }),
      STUB_METRICS,
    );
    // isMachineVerifiable returns false for this (no numeric comparison)
    expect(result.result).toBe("needs_manual_review");
  });

  it("returns needs_manual_review when wrongIf is empty", () => {
    const result = verifyJudgment(
      makeJudgment({ wrongIf: "", metric: "grossMargin" }),
      STUB_METRICS,
    );
    expect(result.result).toBe("needs_manual_review");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// verifyJudgment — 0.0% suspicious guard
// ═══════════════════════════════════════════════════════════════════════════════

describe("verifyJudgment — suspicious zero guard", () => {
  it("returns needs_manual_review when metric is exactly 0", () => {
    const metrics = { ...STUB_METRICS, grossMargin: 0 };
    const result = verifyJudgment(
      makeJudgment({
        wrongIf: "Gross margin falls below 35%",
        metric: "grossMargin",
      }),
      metrics,
    );
    expect(result.result).toBe("needs_manual_review");
    expect(result.notes).toContain("missing data");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// verifyJudgment — evidence URL
// ═══════════════════════════════════════════════════════════════════════════════

describe("verifyJudgment — evidence URL", () => {
  it("includes Yahoo Finance URL for ticker", () => {
    const result = verifyJudgment(makeJudgment({ ticker: "NVDA" }), {
      ...STUB_METRICS,
      ticker: "NVDA",
    });
    expect(result.evidenceUrl).toContain("finance.yahoo.com");
    expect(result.evidenceUrl).toContain("NVDA");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Redline invariants — these must NEVER be violated
// ═══════════════════════════════════════════════════════════════════════════════

describe("Redline: never auto-confirm on ambiguity", () => {
  it("qualitative wrongIf → needs_manual_review, NOT confirmed", () => {
    const result = verifyJudgment(
      makeJudgment({ wrongIf: "Market sentiment shifts", metric: null }),
      STUB_METRICS,
    );
    expect(result.result).not.toBe("confirmed");
    expect(result.result).toBe("needs_manual_review");
  });

  it("empty wrongIf → needs_manual_review, NOT confirmed", () => {
    const result = verifyJudgment(
      makeJudgment({ wrongIf: "", metric: "grossMargin" }),
      STUB_METRICS,
    );
    expect(result.result).not.toBe("confirmed");
  });

  it("null metric → needs_manual_review, NOT confirmed", () => {
    const result = verifyJudgment(
      makeJudgment({ wrongIf: "Something drops below 10%", metric: null }),
      STUB_METRICS,
    );
    expect(result.result).not.toBe("confirmed");
  });

  it("0.0% metric → needs_manual_review, NOT confirmed", () => {
    const metrics = { ...STUB_METRICS, grossMargin: 0 };
    const result = verifyJudgment(
      makeJudgment({
        wrongIf: "Gross margin falls below 35%",
        metric: "grossMargin",
      }),
      metrics,
    );
    expect(result.result).not.toBe("confirmed");
  });
});
