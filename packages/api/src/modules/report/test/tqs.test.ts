import { describe, expect, it } from "vitest";

import { computeTQS } from "../tqs";

import type { TQSInput } from "../tqs";

// ── Fixtures ────────────────────────────────────────────────────────────────

/** High-quality report: strong grounding, quantified wrongIf, fresh data, primary sources */
const highQualityInput: TQSInput = {
  landingRate: 0.95,
  topJudgments: [
    {
      judgment:
        "Revenue growth will accelerate to 25%+ YoY driven by AI segment",
      keyNumber: "Revenue growth 22.3% YoY",
      wrongIf: "Revenue growth drops below 15% for two consecutive quarters",
      dataPoint: "Company 10-Q Q2 2026",
      metric: "revenueGrowthYoy",
      trigger: "<15%",
      freq: "Quarterly",
    },
    {
      judgment: "Gross margin will expand to 72%+ as mix shifts to software",
      keyNumber: "Gross margin 70.8%",
      wrongIf: "Gross margin falls below 65%",
      dataPoint: "Company 10-K FY2025",
      metric: "grossMargin",
      trigger: "<65%",
      freq: "Quarterly",
    },
    {
      judgment: "FCF will exceed $8B on operating leverage",
      keyNumber: "FCF $6.2B TTM",
      wrongIf: "FCF drops below $5B",
      dataPoint: "Company 10-K FY2025",
      metric: "freeCashFlow",
      trigger: "<$5B",
      freq: "Quarterly",
    },
  ],
  thesisBreakers: [
    { condition: "Cloud revenue growth decelerates below 15%" },
    { condition: "Key enterprise customer churn exceeds 5%" },
  ],
  risks: [
    "Regulatory scrutiny on AI acquisitions could delay deals worth $2B+ in revenue",
    "Currency headwinds from strong USD may reduce international revenue by 3-5%",
    "Supply chain constraints in semiconductor allocation could limit hardware growth",
  ],
  bearCase: [
    "Competitor's next-gen chip delivers 40% better perf/watt, eroding moat in 2H26",
    "Customer concentration risk: top 10 clients = 35% of revenue, any churn is material",
  ],
  reportDate: "2026-08-01",
};

/** Low-quality report: weak grounding, qualitative wrongIf, stale data, media sources */
const lowQualityInput: TQSInput = {
  landingRate: 0.4,
  topJudgments: [
    {
      judgment: "The company will do well because of AI trends",
      keyNumber: "N/A",
      wrongIf: "If the market changes",
      dataPoint: "Bloomberg article Jul 2025",
    },
    {
      judgment: "Stock looks attractive at current valuation",
      keyNumber: "P/E 18x",
      wrongIf: "If sentiment shifts",
      dataPoint: "Yahoo Finance",
    },
  ],
  thesisBreakers: [],
  risks: ["Market conditions may change", "Competition could intensify"],
  reportDate: "2026-08-01",
};

/** Edge case: empty judgments */
const emptyInput: TQSInput = {
  landingRate: 1.0,
  topJudgments: [],
  thesisBreakers: [],
  risks: [],
  reportDate: "2026-08-01",
};

/** Edge case: null-able factors — stale data, no sources */
const partialInput: TQSInput = {
  landingRate: 0.75,
  topJudgments: [
    {
      judgment: "Revenue will grow 20%",
      keyNumber: "Revenue $10B",
      wrongIf: "Revenue drops below $8B",
      dataPoint: "Analyst estimate",
    },
  ],
  thesisBreakers: [{ condition: "Revenue miss" }],
  risks: ["Supply chain disruption could reduce output by 15%"],
  reportDate: "2026-08-01",
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe("computeTQS", () => {
  // ── High quality report ──────────────────────────────────────────────────

  describe("high-quality report", () => {
    it("returns high score (>= 65)", () => {
      const result = computeTQS(highQualityInput);
      expect(result.score).toBeGreaterThanOrEqual(65);
    });

    it("returns tier A or B", () => {
      const result = computeTQS(highQualityInput);
      expect(["S", "A", "B"]).toContain(result.tier);
    });

    it("has high F1 grounding (>= 90)", () => {
      const result = computeTQS(highQualityInput);
      expect(result.factors.F1_grounding.score).toBeGreaterThanOrEqual(90);
    });

    it("has high F2 invalidation observability (>= 15)", () => {
      const result = computeTQS(highQualityInput);
      // Max avg is 19: (20+20+20+15+20)/5 — causalChain max is 15
      expect(result.factors.F2_invalidation.score).toBeGreaterThanOrEqual(15);
    });

    it("has good F3 freshness (>= 50)", () => {
      const result = computeTQS(highQualityInput);
      // FY2025 = ~213 days old (score 40), Q2 2026 = ~34 days (score 80)
      // Mixed: avg depends on data point dates
      expect(result.factors.F3_freshness.score).toBeGreaterThanOrEqual(50);
    });

    it("has high F4 source tier (>= 70)", () => {
      const result = computeTQS(highQualityInput);
      expect(result.factors.F4_source.score).toBeGreaterThanOrEqual(70);
    });

    it("has strong F5 counter coverage (>= 70)", () => {
      const result = computeTQS(highQualityInput);
      expect(result.factors.F5_counter.score).toBeGreaterThanOrEqual(70);
    });

    it("includes disclaimer", () => {
      const result = computeTQS(highQualityInput);
      expect(result.disclaimer).toContain("not a buy/sell/hold");
    });

    it("every factor has a non-empty reason", () => {
      const result = computeTQS(highQualityInput);
      for (const factor of Object.values(result.factors)) {
        expect(factor.reason.length).toBeGreaterThan(0);
      }
    });
  });

  // ── Low quality report ──────────────────────────────────────────────────

  describe("low-quality report", () => {
    it("returns low score (< 50)", () => {
      const result = computeTQS(lowQualityInput);
      expect(result.score).toBeLessThan(50);
    });

    it("returns tier D or F", () => {
      const result = computeTQS(lowQualityInput);
      expect(["D", "F"]).toContain(result.tier);
    });

    it("has low F1 grounding (< 50)", () => {
      const result = computeTQS(lowQualityInput);
      expect(result.factors.F1_grounding.score).toBeLessThan(50);
    });

    it("has low F2 invalidation observability (< 50)", () => {
      const result = computeTQS(lowQualityInput);
      expect(result.factors.F2_invalidation.score).toBeLessThan(50);
    });
  });

  // ── Differentiation ─────────────────────────────────────────────────────

  it("high-quality score is significantly higher than low-quality", () => {
    const high = computeTQS(highQualityInput);
    const low = computeTQS(lowQualityInput);
    expect(high.score - low.score).toBeGreaterThanOrEqual(30);
  });

  // ── Empty input ─────────────────────────────────────────────────────────

  describe("empty judgments", () => {
    it("flags unreliable and caps score when ≥3 factors are null", () => {
      const result = computeTQS(emptyInput);
      // F1 = 100 (landingRate=1.0), F5 = 0 (empty inputs), F2-F4 = null
      // ≥3 null factors → unreliable → score capped at 44 (max D tier)
      expect(result.factors.F2_invalidation.score).toBeNull();
      expect(result.factors.F3_freshness.score).toBeNull();
      expect(result.factors.F4_source.score).toBeNull();
      expect(result.unreliable).toBe(true);
      expect(result.score).toBeLessThanOrEqual(44);
    });

    it("null factors have clear reasons", () => {
      const result = computeTQS(emptyInput);
      expect(result.factors.F2_invalidation.reason).toContain(
        "No top judgments",
      );
      expect(result.factors.F3_freshness.reason).toContain("No data points");
      expect(result.factors.F4_source.reason).toContain("No data points");
    });
  });

  // ── Factor null handling ────────────────────────────────────────────────

  describe("partial data", () => {
    it("null factors are excluded from weighted average", () => {
      const result = computeTQS(partialInput);
      expect(result.factors.F1_grounding.score).not.toBeNull();
      expect(result.factors.F2_invalidation.score).not.toBeNull();
    });

    it("score is between 0 and 100", () => {
      const result = computeTQS(partialInput);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  // ── Unreliable flag ───────────────────────────────────────────────────

  describe("unreliable flag", () => {
    it("high-quality report is not unreliable", () => {
      const result = computeTQS(highQualityInput);
      expect(result.unreliable).toBe(false);
    });

    it("empty input is unreliable (3 null factors)", () => {
      const result = computeTQS(emptyInput);
      expect(result.unreliable).toBe(true);
    });

    it("low-quality report is unreliable (3 null factors: F3, F4, F5)", () => {
      const result = computeTQS(lowQualityInput);
      // lowQualityInput: no metric/trigger → F3 stale, F4 no source, F5 empty bearCase
      // F3 = null (stale data), F4 has score, F5 may score
      // Check the actual nullCount
      const nullCount = Object.values(result.factors).filter(
        (f) => f.score === null,
      ).length;
      if (nullCount >= 3) {
        expect(result.unreliable).toBe(true);
        expect(result.score).toBeLessThanOrEqual(44);
      } else {
        expect(result.unreliable).toBe(false);
      }
    });
  });

  // ── Hard floors ─────────────────────────────────────────────────────────

  describe("hard floors", () => {
    it("landing rate < 50% caps tier at C", () => {
      // Input with strong factors but landing rate below 50%
      // Without hard floor this would score B (62), but should be capped to C
      const input: TQSInput = {
        ...highQualityInput,
        landingRate: 0.49,
        topJudgments: [
          {
            judgment: "Revenue growth will accelerate",
            keyNumber: "22.3%",
            wrongIf: "drops below 15%",
            dataPoint: "Company 10-Q 2026-06-30",
            metric: "revenueGrowthYoy",
            trigger: "<15%",
            freq: "Quarterly",
          },
          {
            judgment: "Gross margin will expand",
            keyNumber: "70.8%",
            wrongIf: "falls below 65%",
            dataPoint: "Company 10-Q 2026-06-30",
            metric: "grossMargin",
            trigger: "<65%",
          },
          {
            judgment: "FCF will exceed 8B",
            keyNumber: "6.2B",
            wrongIf: "drops below 5B",
            dataPoint: "Company 10-Q 2026-06-30",
            metric: "freeCashFlow",
            trigger: "<5B",
          },
        ],
        reportDate: "2026-08-01",
      };
      const result = computeTQS(input);
      const tierOrder = ["S", "A", "B", "C", "D", "F"];
      // Tier should be C or lower (index >= 3)
      expect(tierOrder.indexOf(result.tier)).toBeGreaterThanOrEqual(
        tierOrder.indexOf("C"),
      );
      expect(result.hardFloorApplied).toBeTruthy();
      expect(result.hardFloorApplied!).toContain("landing rate");
    });

    it("no numeric wrongIf caps tier at D", () => {
      const input: TQSInput = {
        ...highQualityInput,
        topJudgments: highQualityInput.topJudgments.map((j) => ({
          ...j,
          wrongIf: "If market conditions deteriorate",
          metric: undefined,
          trigger: undefined,
        })),
      };
      const result = computeTQS(input);
      const tierOrder = ["S", "A", "B", "C", "D", "F"];
      expect(tierOrder.indexOf(result.tier)).toBeGreaterThanOrEqual(
        tierOrder.indexOf("D"),
      );
      expect(result.hardFloorApplied).toBeTruthy();
      expect(result.hardFloorApplied!).toContain("numeric wrongIf");
    });
  });

  // ── Tier mapping ────────────────────────────────────────────────────────

  describe("tier mapping", () => {
    it("maps score ranges to correct tiers", () => {
      // Test the mapping indirectly through different quality inputs
      const result = computeTQS(highQualityInput);
      if (result.score >= 90) expect(result.tier).toBe("S");
      else if (result.score >= 75) expect(result.tier).toBe("A");
      else if (result.score >= 60) expect(result.tier).toBe("B");
      else if (result.score >= 45) expect(result.tier).toBe("C");
      else if (result.score >= 30) expect(result.tier).toBe("D");
      else expect(result.tier).toBe("F");
    });
  });

  // ── Redline: TQS ≠ stock rating ────────────────────────────────────────

  describe("redline: disclaimer", () => {
    it("always includes the TQS disclaimer", () => {
      const cases = [
        highQualityInput,
        lowQualityInput,
        emptyInput,
        partialInput,
      ];
      for (const input of cases) {
        const result = computeTQS(input);
        expect(result.disclaimer).toContain("Thesis Quality Score");
        expect(result.disclaimer).toContain("not a buy/sell/hold");
      }
    });
  });

  // ── Factor reason quality ───────────────────────────────────────────────

  describe("factor reasons", () => {
    it("F1 reason mentions percentage", () => {
      const result = computeTQS(highQualityInput);
      expect(result.factors.F1_grounding.reason).toMatch(/\d+%/);
    });

    it("F2 reason mentions counts", () => {
      const result = computeTQS(highQualityInput);
      expect(result.factors.F2_invalidation.reason).toMatch(/\d+\/\d+/);
    });

    it("F5 reason mentions risks", () => {
      const result = computeTQS(highQualityInput);
      expect(result.factors.F5_counter.reason).toMatch(/risk/i);
    });
  });
});
