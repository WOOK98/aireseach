import { describe, expect, it } from "vitest";

import {
  validateLandingRate,
  buildRetryPromptSuffix,
  type JudgmentLike,
} from "../landing-validator";

// ─── L1 断言落地校验器 — 三路径测试 ─────────────────────────────────────────
// 路径 1: 全落地（all dataPoint bound）
// 路径 2: 部分落地（landing rate < 0.85, triggers retry）
// 路径 3: 重试后仍不达标（degradation path）

const makeJudgment = (overrides?: Partial<JudgmentLike>): JudgmentLike => ({
  judgment: "Revenue growth re-accelerates to 15%+ YoY",
  keyNumber: "Revenue Growth YoY 12.3%",
  wrongIf: "Revenue growth drops below 8% for two consecutive quarters",
  dataPoint: "Yahoo Finance Q2 2026",
  ...overrides,
});

describe("L1 landing validator — validateLandingRate", () => {
  // ── Path 1: All landed ──────────────────────────────────────────────────
  describe("path 1: all judgments have dataPoint → passes", () => {
    it("3/3 bound → rate 1.0, passed=true", () => {
      const judgments = [
        makeJudgment({ dataPoint: "Yahoo Finance Q2 2026" }),
        makeJudgment({
          judgment: "Margin expansion",
          dataPoint: "Company 10-K FY2025",
        }),
        makeJudgment({
          judgment: "FCF yield above 5%",
          dataPoint: "Bloomberg July 2026",
        }),
      ];
      const result = validateLandingRate(judgments);
      expect(result.rate).toBe(1);
      expect(result.landed).toBe(3);
      expect(result.total).toBe(3);
      expect(result.passed).toBe(true);
      expect(result.unbound).toHaveLength(0);
    });

    it("empty judgments → rate 1.0, passed=true", () => {
      const result = validateLandingRate([]);
      expect(result.rate).toBe(1);
      expect(result.passed).toBe(true);
    });
  });

  // ── Path 2: Partial landing (below threshold) ───────────────────────────
  describe("path 2: partial landing → triggers retry", () => {
    it("1/3 bound → rate 0.33, passed=false", () => {
      const judgments = [
        makeJudgment({ dataPoint: "Yahoo Finance Q2 2026" }),
        makeJudgment({ judgment: "Unbound judgment 1", dataPoint: undefined }),
        makeJudgment({ judgment: "Unbound judgment 2", dataPoint: undefined }),
      ];
      const result = validateLandingRate(judgments);
      expect(result.rate).toBeCloseTo(1 / 3, 2);
      expect(result.landed).toBe(1);
      expect(result.total).toBe(3);
      expect(result.passed).toBe(false);
      expect(result.unbound).toEqual([
        "Unbound judgment 1",
        "Unbound judgment 2",
      ]);
    });

    it("2/3 bound → rate 0.67, passed=false (below 0.85)", () => {
      const judgments = [
        makeJudgment({ dataPoint: "Yahoo Finance Q2 2026" }),
        makeJudgment({ dataPoint: "Company 10-K FY2025" }),
        makeJudgment({ judgment: "No source", dataPoint: undefined }),
      ];
      const result = validateLandingRate(judgments);
      expect(result.rate).toBeCloseTo(2 / 3, 2);
      expect(result.passed).toBe(false);
    });

    it("empty/invalid dataPoint values count as unbound", () => {
      const judgments = [
        makeJudgment({ dataPoint: "" }),
        makeJudgment({ dataPoint: "N/A" }),
        makeJudgment({ dataPoint: "unknown" }),
        makeJudgment({ dataPoint: "  " }),
        makeJudgment({ dataPoint: "—" }),
      ];
      const result = validateLandingRate(judgments);
      expect(result.landed).toBe(0);
      expect(result.passed).toBe(false);
      expect(result.unbound).toHaveLength(5);
    });

    it("custom threshold 0.5 → 2/4 bound passes", () => {
      const judgments = [
        makeJudgment({ dataPoint: "Yahoo Finance Q2 2026" }),
        makeJudgment({ dataPoint: "Company 10-K FY2025" }),
        makeJudgment({ judgment: "No source 1", dataPoint: undefined }),
        makeJudgment({ judgment: "No source 2", dataPoint: undefined }),
      ];
      const result = validateLandingRate(judgments, { threshold: 0.5 });
      expect(result.rate).toBe(0.5);
      expect(result.passed).toBe(true);
    });
  });

  // ── Path 3: Retry still fails ───────────────────────────────────────────
  describe("path 3: retry still fails → degradation", () => {
    it("0/3 bound → rate 0, all unbound", () => {
      const judgments = [
        makeJudgment({ dataPoint: undefined }),
        makeJudgment({ judgment: "No source 2", dataPoint: undefined }),
        makeJudgment({ judgment: "No source 3", dataPoint: undefined }),
      ];
      const result = validateLandingRate(judgments);
      expect(result.rate).toBe(0);
      expect(result.landed).toBe(0);
      expect(result.passed).toBe(false);
      expect(result.unbound).toHaveLength(3);
    });
  });
});

describe("L1 landing validator — buildRetryPromptSuffix", () => {
  it("returns empty string when passed", () => {
    const result = {
      rate: 1,
      landed: 3,
      total: 3,
      unbound: [],
      passed: true,
    };
    expect(buildRetryPromptSuffix(result)).toBe("");
  });

  it("lists unbound assertions when failed", () => {
    const result = {
      rate: 0.33,
      landed: 1,
      total: 3,
      unbound: ["Unbound judgment A", "Unbound judgment B"],
      passed: false,
    };
    const suffix = buildRetryPromptSuffix(result);
    expect(suffix).toContain("L1 LANDING CHECK FAILED");
    expect(suffix).toContain("1/3");
    expect(suffix).toContain("Unbound judgment A");
    expect(suffix).toContain("Unbound judgment B");
    expect(suffix).toContain("dataPoint");
  });
});

describe("L1 landing validator — binding edge cases", () => {
  it("valid binding with hyphenated source", () => {
    const judgments = [makeJudgment({ dataPoint: "Yahoo-Finance Q2 2026" })];
    const result = validateLandingRate(judgments);
    expect(result.landed).toBe(1);
  });

  it("valid binding with slash in period", () => {
    const judgments = [makeJudgment({ dataPoint: "SEC Filing 2025/2026" })];
    const result = validateLandingRate(judgments);
    expect(result.landed).toBe(1);
  });

  it("tbd and pending count as unbound", () => {
    const judgments = [
      makeJudgment({ dataPoint: "TBD" }),
      makeJudgment({ judgment: "J2", dataPoint: "pending" }),
    ];
    const result = validateLandingRate(judgments);
    expect(result.landed).toBe(0);
    expect(result.passed).toBe(false);
  });
});
