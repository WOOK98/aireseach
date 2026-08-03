import { describe, expect, it } from "vitest";

import {
  fmtNum,
  fmtCompactNum,
  fmtCompactMoney,
  fmtMoney,
  fmtRatio,
} from "../format";

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

  describe("fmtCompactMoney", () => {
    it("uses ISO code for USD", () => {
      expect(fmtCompactMoney(1.5e9, "USD")).toBe("USD 1.50B");
    });

    it("uses ISO code for CNY (no ¥ symbol)", () => {
      expect(fmtCompactMoney(10e9, "CNY")).toBe("CNY 10.00B");
    });

    it("uses ISO code for JPY (no ¥ symbol)", () => {
      expect(fmtCompactMoney(500e9, "JPY")).toBe("JPY 500.00B");
    });

    it("uses ISO code for EUR", () => {
      expect(fmtCompactMoney(2.3e12, "EUR")).toBe("EUR 2.30T");
    });

    it("returns null for null", () => {
      expect(fmtCompactMoney(null, "USD")).toBeNull();
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
});
