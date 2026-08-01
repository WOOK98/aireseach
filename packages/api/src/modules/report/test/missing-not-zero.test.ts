/**
 * #57 — Historical series: missing ≠ 0
 *
 * Tests that Yahoo Finance data extraction produces null for missing data
 * points instead of 0, and that real zeros remain distinguishable.
 */

import { describe, expect, it } from "vitest";

// ── Helpers (outer scope per lint: consistent-function-scoping) ──────────

function safeOrNull(val: { raw: number } | undefined): number | null {
  if (val == null || val.raw == null || !Number.isFinite(val.raw)) return null;
  return val.raw;
}

type State = "missing" | "real_zero" | "positive";

function classify(val: number | null): State {
  if (val === null) return "missing";
  if (val === 0) return "real_zero";
  return "positive";
}

function computeGrossMargin(
  totalRevenue?: { raw: number },
  grossProfit?: { raw: number },
): number | null {
  const rev = safeOrNull(totalRevenue);
  const gp = safeOrNull(grossProfit);
  if (rev != null && rev > 0 && gp != null) {
    return Math.round((gp / rev) * 1000) / 10;
  }
  return null;
}

function computeFcf(
  ops?: { raw: number },
  capex?: { raw: number },
): number | null {
  const o = safeOrNull(ops);
  const c = safeOrNull(capex);
  if (o != null && c != null) return Math.round((o + c) / 1e6);
  return null;
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("#57 missing != 0 — sentinel logic", () => {
  describe("safeOrNull", () => {
    it("returns null for undefined (missing field)", () => {
      expect(safeOrNull(undefined)).toBeNull();
    });

    it("returns null for object with raw=undefined", () => {
      expect(safeOrNull({ raw: undefined as any })).toBeNull();
    });

    it("returns null for object with raw=NaN", () => {
      expect(safeOrNull({ raw: NaN })).toBeNull();
    });

    it("returns 0 for object with raw=0 (real zero)", () => {
      expect(safeOrNull({ raw: 0 })).toBe(0);
    });

    it("returns positive number", () => {
      expect(safeOrNull({ raw: 42.5 })).toBe(42.5);
    });

    it("returns negative number", () => {
      expect(safeOrNull({ raw: -100 })).toBe(-100);
    });
  });

  describe("margin history null propagation", () => {
    it("returns real margin when both values present", () => {
      expect(computeGrossMargin({ raw: 100_000 }, { raw: 45_000 })).toBe(45);
    });

    it("returns null when revenue missing", () => {
      expect(computeGrossMargin(undefined, { raw: 45_000 })).toBeNull();
    });

    it("returns null when grossProfit missing", () => {
      expect(computeGrossMargin({ raw: 100_000 }, undefined)).toBeNull();
    });

    it("returns null when both missing", () => {
      expect(computeGrossMargin(undefined, undefined)).toBeNull();
    });

    it("returns null when revenue is 0 (avoid div-by-zero → fake 0%)", () => {
      expect(computeGrossMargin({ raw: 0 }, { raw: 45_000 })).toBeNull();
    });

    it("returns real 0% margin when gp=0 and rev>0 (genuine zero)", () => {
      expect(computeGrossMargin({ raw: 100_000 }, { raw: 0 })).toBe(0);
    });
  });

  describe("FCF history null propagation", () => {
    it("returns real FCF when both present", () => {
      expect(computeFcf({ raw: 10e9 }, { raw: -3e9 })).toBe(7000);
    });

    it("returns null when operating cash flow missing", () => {
      expect(computeFcf(undefined, { raw: -3e9 })).toBeNull();
    });

    it("returns null when capex missing", () => {
      expect(computeFcf({ raw: 10e9 }, undefined)).toBeNull();
    });

    it("returns real 0 when ops + capex = 0 (genuine zero)", () => {
      expect(computeFcf({ raw: 5e9 }, { raw: -5e9 })).toBe(0);
    });
  });

  describe("three-state distinguishability", () => {
    it("null → missing", () => {
      expect(classify(null)).toBe("missing");
    });

    it("0 → real_zero", () => {
      expect(classify(0)).toBe("real_zero");
    });

    it("42 → positive", () => {
      expect(classify(42)).toBe("positive");
    });

    it("all three states are distinguishable", () => {
      const states = new Set([classify(null), classify(0), classify(42)]);
      expect(states.size).toBe(3);
    });
  });

  describe("QuarterlyPoint null support", () => {
    interface QuarterlyPoint {
      period: string;
      value: number | null;
    }

    it("supports null values in history arrays", () => {
      const history: QuarterlyPoint[] = [
        { period: "Q1 2025", value: 45.2 },
        { period: "Q2 2025", value: null },
        { period: "Q3 2025", value: 0 },
        { period: "Q4 2025", value: 47.8 },
      ];

      const nonNull = history.filter((p) => p.value != null);
      expect(nonNull).toHaveLength(3);

      const missing = history.filter((p) => p.value === null);
      expect(missing).toHaveLength(1);
      expect(missing[0]!.period).toBe("Q2 2025");

      const realZeros = history.filter((p) => p.value === 0);
      expect(realZeros).toHaveLength(1);
    });

    it("all-null series should not render chart (guard)", () => {
      const allNull: QuarterlyPoint[] = [
        { period: "Q1 2025", value: null },
        { period: "Q2 2025", value: null },
        { period: "Q3 2025", value: null },
        { period: "Q4 2025", value: null },
      ];

      // .some() returns false for empty too, so length check is redundant per lint
      const shouldRender = allNull.some((p) => p.value != null);
      expect(shouldRender).toBe(false);
    });

    it("partial-null series should render (null points become gaps)", () => {
      const partial: QuarterlyPoint[] = [
        { period: "Q1 2025", value: 45.2 },
        { period: "Q2 2025", value: null },
        { period: "Q3 2025", value: 47.8 },
        { period: "Q4 2025", value: null },
      ];

      const shouldRender = partial.some((p) => p.value != null);
      expect(shouldRender).toBe(true);
    });
  });
});
