/**
 * L3 Ledger Verification Engine — Unit Tests
 *
 * 30+ test cases covering:
 *   - isMachineVerifiable (numeric vs qualitative)
 *   - parseWrongIf (word patterns, symbolic operators, edge cases)
 *   - evaluateCondition (all operators, boundary values)
 *   - extractMetricValue (various metric types, null/undefined)
 *   - isSuspiciouslyZero (0.0% guard)
 *   - resolveMetricName (aliases, partial matches)
 *
 * Redline tests: needs_manual_review triggers, insufficient_data paths,
 * no-confirmed-on-null guard.
 */

import { describe, it, expect } from "vitest";

import {
  isMachineVerifiable,
  parseWrongIf,
  evaluateCondition,
  extractMetricValue,
  isSuspiciouslyZero,
  resolveMetricName,
} from "../verifier";

import type { VerifiableJudgment, FinancialMetrics } from "../verifier";

// ── Helper ──────────────────────────────────────────────────────────────────

function makeJudgment(
  overrides: Partial<VerifiableJudgment> = {},
): VerifiableJudgment {
  return {
    id: "j1",
    ticker: "AAPL",
    judgment: "test judgment",
    keyNumber: "Gross Margin 74.9%",
    wrongIf: "Gross margin falls below 65%",
    metric: "grossMargin",
    ...overrides,
  };
}

// Use a minimal FinancialMetrics stub — only the fields we actually test
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

// ═══════════════════════════════════════════════════════════════════════════════
// isMachineVerifiable
// ═══════════════════════════════════════════════════════════════════════════════

describe("isMachineVerifiable", () => {
  it("returns true for numeric comparison with metric field", () => {
    expect(
      isMachineVerifiable(
        makeJudgment({
          wrongIf: "Gross margin falls below 65%",
          metric: "grossMargin",
        }),
      ),
    ).toBe(true);
  });

  it("returns true for symbolic operator", () => {
    expect(
      isMachineVerifiable(
        makeJudgment({
          wrongIf: "<8%",
          metric: "revenueGrowthYoy",
        }),
      ),
    ).toBe(true);
  });

  it("returns true for 'exceeds' pattern", () => {
    expect(
      isMachineVerifiable(
        makeJudgment({
          wrongIf: "P/E exceeds 30x",
          metric: "peRatio",
        }),
      ),
    ).toBe(true);
  });

  it("returns true for metric inferred from wrongIf text", () => {
    expect(
      isMachineVerifiable(
        makeJudgment({
          wrongIf: "revenue growth drops below 5%",
          metric: null,
        }),
      ),
    ).toBe(true);
  });

  it("returns false for qualitative 'Management loses confidence'", () => {
    expect(
      isMachineVerifiable(
        makeJudgment({
          wrongIf: "Management loses confidence",
          metric: null,
        }),
      ),
    ).toBe(false);
  });

  it("returns false for event-based 'Key customer churns'", () => {
    expect(
      isMachineVerifiable(
        makeJudgment({
          wrongIf: "Key customer churns",
          metric: null,
        }),
      ),
    ).toBe(false);
  });

  it("returns false for 'Market sentiment shifts'", () => {
    expect(
      isMachineVerifiable(
        makeJudgment({
          wrongIf: "Market sentiment shifts dramatically",
          metric: null,
        }),
      ),
    ).toBe(false);
  });

  it("returns false for empty wrongIf", () => {
    expect(isMachineVerifiable(makeJudgment({ wrongIf: "" }))).toBe(false);
  });

  it("returns false for wrongIf with number but no metric", () => {
    expect(
      isMachineVerifiable(
        makeJudgment({
          wrongIf: "Something drops below 10",
          metric: null,
        }),
      ),
    ).toBe(false);
  });

  it("returns false for wrongIf with metric but no numeric comparison", () => {
    expect(
      isMachineVerifiable(
        makeJudgment({
          wrongIf: "Gross margin deteriorates significantly",
          metric: "grossMargin",
        }),
      ),
    ).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// parseWrongIf
// ═══════════════════════════════════════════════════════════════════════════════

describe("parseWrongIf", () => {
  it("parses 'falls below 65%'", () => {
    const result = parseWrongIf("Gross margin falls below 65%", "grossMargin");
    expect(result).toEqual({
      metric: "grossMargin",
      operator: "<",
      threshold: 65,
      unit: "%",
      machineVerifiable: true,
    });
  });

  it("parses 'drops below 8%'", () => {
    const result = parseWrongIf(
      "Revenue growth drops below 8%",
      "revenueGrowthYoy",
    );
    expect(result).toEqual({
      metric: "revenueGrowthYoy",
      operator: "<",
      threshold: 8,
      unit: "%",
      machineVerifiable: true,
    });
  });

  it("parses 'exceeds 30x'", () => {
    const result = parseWrongIf("P/E exceeds 30x", "peRatio");
    expect(result).toEqual({
      metric: "peRatio",
      operator: ">",
      threshold: 30,
      unit: "x",
      machineVerifiable: true,
    });
  });

  it("parses symbolic '<65%'", () => {
    const result = parseWrongIf("<65%", "grossMargin");
    expect(result).toEqual({
      metric: "grossMargin",
      operator: "<",
      threshold: 65,
      unit: "%",
      machineVerifiable: true,
    });
  });

  it("parses symbolic '>30x'", () => {
    const result = parseWrongIf(">30x", "peRatio");
    expect(result).toEqual({
      metric: "peRatio",
      operator: ">",
      threshold: 30,
      unit: "x",
      machineVerifiable: true,
    });
  });

  it("parses symbolic '<=5%'", () => {
    const result = parseWrongIf("<=5%", "revenueGrowthYoy");
    expect(result).toEqual({
      metric: "revenueGrowthYoy",
      operator: "<=",
      threshold: 5,
      unit: "%",
      machineVerifiable: true,
    });
  });

  it("parses 'under $1.50'", () => {
    const result = parseWrongIf("EPS falls under $1.50", "eps");
    expect(result).toEqual({
      metric: "eps",
      operator: "<",
      threshold: 1.5,
      unit: "",
      machineVerifiable: true,
    });
  });

  it("infers metric from wrongIf text when metric field is null", () => {
    const result = parseWrongIf("revenue growth drops below 5%", null);
    expect(result).not.toBeNull();
    expect(result!.metric).toBe("revenueGrowthYoy");
    expect(result!.operator).toBe("<");
    expect(result!.threshold).toBe(5);
  });

  it("returns null for unparseable qualitative condition", () => {
    expect(parseWrongIf("Management loses confidence", null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseWrongIf("", "grossMargin")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(parseWrongIf(null as unknown as string, "grossMargin")).toBeNull();
  });

  it("returns null when no metric can be resolved", () => {
    expect(parseWrongIf("Something drops below 10%", null)).toBeNull();
  });

  it("prefers explicit metric field over text inference", () => {
    const result = parseWrongIf("revenue growth drops below 5%", "grossMargin");
    expect(result).not.toBeNull();
    expect(result!.metric).toBe("grossMargin");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// evaluateCondition
// ═══════════════════════════════════════════════════════════════════════════════

const makeCond = (
  op: "<" | ">" | "<=" | ">=" | "==" | "!=",
  threshold: number,
) => ({
  metric: "grossMargin",
  operator: op,
  threshold,
  unit: "%",
  machineVerifiable: true,
});

describe("evaluateCondition", () => {
  it("< triggered when value below threshold", () => {
    expect(evaluateCondition(makeCond("<", 65), 60).triggered).toBe(true);
  });

  it("< not triggered when value at threshold", () => {
    expect(evaluateCondition(makeCond("<", 65), 65).triggered).toBe(false);
  });

  it("< not triggered when value above threshold", () => {
    expect(evaluateCondition(makeCond("<", 65), 70).triggered).toBe(false);
  });

  it("> triggered when value above threshold", () => {
    expect(evaluateCondition(makeCond(">", 30), 35).triggered).toBe(true);
  });

  it("> not triggered when value at threshold", () => {
    expect(evaluateCondition(makeCond(">", 30), 30).triggered).toBe(false);
  });

  it("<= triggered when value equals threshold", () => {
    expect(evaluateCondition(makeCond("<=", 65), 65).triggered).toBe(true);
  });

  it(">= triggered when value equals threshold", () => {
    expect(evaluateCondition(makeCond(">=", 30), 30).triggered).toBe(true);
  });

  it("== triggered when value equals threshold", () => {
    expect(evaluateCondition(makeCond("==", 65), 65).triggered).toBe(true);
  });

  it("!= triggered when value differs", () => {
    expect(evaluateCondition(makeCond("!=", 65), 66).triggered).toBe(true);
  });

  it("handles NaN current value gracefully", () => {
    const result = evaluateCondition(makeCond("<", 65), NaN);
    expect(result.triggered).toBe(false);
    expect(result.explanation).toContain("Cannot evaluate");
  });

  it("handles negative thresholds", () => {
    const result = evaluateCondition(makeCond("<", 0), -10);
    expect(result.triggered).toBe(true);
  });

  it("handles decimal precision", () => {
    const result = evaluateCondition(makeCond("<", 65.5), 65.4);
    expect(result.triggered).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// extractMetricValue
// ═══════════════════════════════════════════════════════════════════════════════

describe("extractMetricValue", () => {
  it("extracts grossMargin", () => {
    expect(extractMetricValue(STUB_METRICS, "grossMargin")).toBe(43.3);
  });

  it("extracts revenueGrowthYoy", () => {
    expect(extractMetricValue(STUB_METRICS, "revenueGrowthYoy")).toBe(8.5);
  });

  it("extracts peRatio", () => {
    expect(extractMetricValue(STUB_METRICS, "peRatio")).toBe(24.4);
  });

  it("extracts eps", () => {
    expect(extractMetricValue(STUB_METRICS, "eps")).toBe(6.15);
  });

  it("returns null for null metric value", () => {
    expect(extractMetricValue(STUB_METRICS, "netCash")).toBeNull();
  });

  it("returns null for nonexistent metric", () => {
    expect(
      extractMetricValue(
        STUB_METRICS,
        "nonexistentMetric" as keyof FinancialMetrics,
      ),
    ).toBeNull();
  });

  it("returns null for null metrics object", () => {
    expect(
      extractMetricValue(null as unknown as FinancialMetrics, "grossMargin"),
    ).toBeNull();
  });

  it("returns null for empty metric name", () => {
    expect(extractMetricValue(STUB_METRICS, "")).toBeNull();
  });

  it("extracts freeCashFlow", () => {
    expect(extractMetricValue(STUB_METRICS, "freeCashFlow")).toBe(110e9);
  });

  it("extracts fcfMargin", () => {
    expect(extractMetricValue(STUB_METRICS, "fcfMargin")).toBe(27.9);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// isSuspiciouslyZero
// ═══════════════════════════════════════════════════════════════════════════════

describe("isSuspiciouslyZero", () => {
  it("returns true for 0", () => {
    expect(isSuspiciouslyZero(0)).toBe(true);
  });

  it("returns true for null", () => {
    expect(isSuspiciouslyZero(null)).toBe(true);
  });

  it("returns true for undefined", () => {
    expect(isSuspiciouslyZero(undefined)).toBe(true);
  });

  it("returns false for positive value", () => {
    expect(isSuspiciouslyZero(43.3)).toBe(false);
  });

  it("returns false for negative value", () => {
    expect(isSuspiciouslyZero(-5)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// resolveMetricName
// ═══════════════════════════════════════════════════════════════════════════════

describe("resolveMetricName", () => {
  it("resolves 'grossMargin'", () => {
    expect(resolveMetricName("grossMargin")).toBe("grossMargin");
  });

  it("resolves 'Gross Margin' (case insensitive)", () => {
    expect(resolveMetricName("Gross Margin")).toBe("grossMargin");
  });

  it("resolves 'revenue growth' to revenueGrowthYoy", () => {
    expect(resolveMetricName("revenue growth")).toBe("revenueGrowthYoy");
  });

  it("resolves 'P/E' to peRatio", () => {
    expect(resolveMetricName("P/E")).toBe("peRatio");
  });

  it("resolves 'free cash flow' to freeCashFlow", () => {
    expect(resolveMetricName("free cash flow")).toBe("freeCashFlow");
  });

  it("returns null for empty string", () => {
    expect(resolveMetricName("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(resolveMetricName(null)).toBeNull();
  });

  it("returns null for unresolvable name", () => {
    expect(resolveMetricName("unicornCount")).toBeNull();
  });

  it("resolves partial match from wrongIf text", () => {
    expect(resolveMetricName("revenue growth drops below 8%")).toBe(
      "revenueGrowthYoy",
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Redline tests: safety invariants that must NEVER be violated
// ═══════════════════════════════════════════════════════════════════════════════

describe("Redline: no confirmed on null/zero/unparseable", () => {
  it("qualitative wrongIf → needs_manual_review (not confirmed)", () => {
    const judgment = makeJudgment({
      wrongIf: "Management loses confidence",
      metric: null,
    });
    expect(isMachineVerifiable(judgment)).toBe(false);
    // In the runner, this maps to needs_manual_review, never confirmed
  });

  it("event-based wrongIf → needs_manual_review (not confirmed)", () => {
    const judgment = makeJudgment({
      wrongIf: "Key customer churns",
      metric: null,
    });
    expect(isMachineVerifiable(judgment)).toBe(false);
  });

  it("unparseable wrongIf → parseWrongIf returns null → needs_manual_review", () => {
    expect(
      parseWrongIf(
        "significant deterioration in competitive position",
        "grossMargin",
      ),
    ).toBeNull();
  });

  it("0.0% value is suspicious — must not silently confirm", () => {
    expect(isSuspiciouslyZero(0)).toBe(true);
  });

  it("null metric value → extractMetricValue returns null → needs_manual_review", () => {
    expect(
      extractMetricValue(
        STUB_METRICS,
        "nonexistentMetric" as keyof FinancialMetrics,
      ),
    ).toBeNull();
  });
});
