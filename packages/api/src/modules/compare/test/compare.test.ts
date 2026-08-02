import { describe, expect, it } from "vitest";

// ── Helper functions extracted for testing ───────────────────────────────────
// These mirror the functions in router.ts but are tested in isolation.

function fmtNum(value: number | null | undefined, suffix = ""): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${value.toFixed(1)}${suffix}`;
}

function fmtCompactNum(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toFixed(2)}`;
}

function fmtMoney(
  value: number | null | undefined,
  currency: string,
): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function fmtRatio(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${value.toFixed(1)}x`;
}

// ── Period mismatch detection ────────────────────────────────────────────────

function detectPeriodMismatch(
  periodLabels: Record<string, string | null>,
): boolean {
  const periods = Object.values(periodLabels).filter(Boolean);
  const unique = new Set(periods);
  return periods.length > 1 && unique.size > 1;
}

// ── Cross-currency detection ─────────────────────────────────────────────────

function detectCrossCurrency(
  currencies: Record<string, string | undefined>,
): boolean {
  const unique = new Set(Object.values(currencies).filter(Boolean));
  return unique.size > 1;
}

// ── Null-coercion check ─────────────────────────────────────────────────────
// Ensures null values are never converted to 0 or filled with other data.

function nullSafeExtract(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("compare helpers", () => {
  describe("fmtNum", () => {
    it("formats a percentage", () => {
      expect(fmtNum(74.9, "%")).toBe("74.9%");
    });

    it("returns null for null", () => {
      expect(fmtNum(null)).toBeNull();
    });

    it("returns null for undefined", () => {
      expect(fmtNum(undefined)).toBeNull();
    });

    it("returns null for NaN", () => {
      expect(fmtNum(NaN)).toBeNull();
    });

    it("returns null for Infinity", () => {
      expect(fmtNum(Infinity)).toBeNull();
    });
  });

  describe("fmtCompactNum", () => {
    it("formats trillions", () => {
      expect(fmtCompactNum(3.2e12)).toBe("3.20T");
    });

    it("formats billions", () => {
      expect(fmtCompactNum(1.5e9)).toBe("1.50B");
    });

    it("formats millions", () => {
      expect(fmtCompactNum(250e6)).toBe("250.00M");
    });

    it("formats thousands", () => {
      expect(fmtCompactNum(50000)).toBe("50.0K");
    });

    it("formats small numbers", () => {
      expect(fmtCompactNum(42.5)).toBe("42.50");
    });

    it("handles negative values", () => {
      expect(fmtCompactNum(-1.5e9)).toBe("-1.50B");
    });

    it("returns null for null", () => {
      expect(fmtCompactNum(null)).toBeNull();
    });

    it("returns null for NaN", () => {
      expect(fmtCompactNum(NaN)).toBeNull();
    });
  });

  describe("fmtMoney", () => {
    it("formats USD", () => {
      const result = fmtMoney(150.5, "USD");
      // 150.5 rounds to 151 with maximumFractionDigits: 0 (value >= 100)
      expect(result).toContain("$");
      expect(result).toContain("151");
    });

    it("formats JPY", () => {
      const result = fmtMoney(1500, "JPY");
      expect(result).toContain("1,500");
      expect(result).toContain("¥");
    });

    it("returns null for null", () => {
      expect(fmtMoney(null, "USD")).toBeNull();
    });

    it("returns null for NaN", () => {
      expect(fmtMoney(NaN, "USD")).toBeNull();
    });
  });

  describe("fmtRatio", () => {
    it("formats a ratio", () => {
      expect(fmtRatio(25.3)).toBe("25.3x");
    });

    it("returns null for null", () => {
      expect(fmtRatio(null)).toBeNull();
    });

    it("returns null for NaN", () => {
      expect(fmtRatio(NaN)).toBeNull();
    });
  });

  describe("detectPeriodMismatch", () => {
    it("returns false when all periods match", () => {
      expect(
        detectPeriodMismatch({
          NVDA: "Q2 2025",
          AMD: "Q2 2025",
          INTC: "Q2 2025",
        }),
      ).toBe(false);
    });

    it("returns true when periods differ", () => {
      expect(
        detectPeriodMismatch({
          NVDA: "Q2 2025",
          AMD: "Q1 2025",
          INTC: "Q2 2025",
        }),
      ).toBe(true);
    });

    it("returns false when only one ticker has a period", () => {
      expect(
        detectPeriodMismatch({
          NVDA: "Q2 2025",
          AMD: null,
        }),
      ).toBe(false);
    });

    it("returns false when all are null", () => {
      expect(
        detectPeriodMismatch({
          NVDA: null,
          AMD: null,
        }),
      ).toBe(false);
    });
  });

  describe("detectCrossCurrency", () => {
    it("returns false when all currencies match", () => {
      expect(
        detectCrossCurrency({
          NVDA: "USD",
          AMD: "USD",
        }),
      ).toBe(false);
    });

    it("returns true when currencies differ", () => {
      expect(
        detectCrossCurrency({
          NVDA: "USD",
          TSM: "TWD",
        }),
      ).toBe(true);
    });

    it("returns false when only one ticker has currency", () => {
      expect(
        detectCrossCurrency({
          NVDA: "USD",
          AMD: undefined,
        }),
      ).toBe(false);
    });
  });

  describe("nullSafeExtract", () => {
    it("returns value when present", () => {
      expect(nullSafeExtract(42)).toBe(42);
    });

    it("returns null for null", () => {
      expect(nullSafeExtract(null)).toBeNull();
    });

    it("returns null for undefined", () => {
      expect(nullSafeExtract(undefined)).toBeNull();
    });

    it("returns null for NaN", () => {
      expect(nullSafeExtract(NaN)).toBeNull();
    });

    it("NEVER coerces null to 0", () => {
      // This is the critical redline: missing values must not become 0
      expect(nullSafeExtract(null)).not.toBe(0);
      expect(nullSafeExtract(undefined)).not.toBe(0);
    });

    it("preserves actual 0 values", () => {
      // Legitimate zero values should be preserved
      expect(nullSafeExtract(0)).toBe(0);
    });
  });
});
