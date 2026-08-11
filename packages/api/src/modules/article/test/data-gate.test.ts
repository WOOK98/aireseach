/**
 * Research Article MVP — Data gate pure-function tests (#116)
 *
 * Validates buildInputSpine() and hasVerifiedInput():
 *   - No verified inputs → gate closed (degrade, don't call LLM)
 *   - Any single verified input → gate open
 *   - All verified inputs → gate open
 *   - verifiedSources populated correctly
 */
import { describe, it, expect } from "vitest";

import { buildInputSpine, hasVerifiedInput } from "../data-gate";

import type { InputSpine } from "../data-gate";
import type { FinancialMetrics } from "@workspace/shared/types/report";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_FINANCIALS: FinancialMetrics = {
  companyName: "NVIDIA Corporation",
  ticker: "NVDA",
  exchange: "NASDAQ",
  sector: "Technology",
  industry: "Semiconductors",
  description: "AI GPU leader",
  currentPrice: 130,
  marketCap: 3_000_000_000_000,
  currency: "USD",
  priceChange: 5,
  priceChangePercent: 0.04,
  marketState: "REGULAR",
  revenue: 115_000_000_000,
  revenueGrowthYoy: 1.4,
  grossProfit: 86_480_000_000,
  grossMargin: 0.752,
  operatingIncome: 71_300_000_000,
  operatingMargin: 0.62,
  netIncome: 63_250_000_000,
  netMargin: 0.55,
  ebitda: 70_000_000_000,
  eps: 2.58,
  epsGrowthYoy: 1.2,
  totalCash: 26_000_000_000,
  totalDebt: 11_000_000_000,
  netCash: 15_000_000_000,
  peRatio: 60,
  pbRatio: 40,
  psRatio: 30,
  evEbitda: 50,
  forwardPE: 45,
  freeCashFlow: 60_000_000_000,
  fcfMargin: 0.52,
  revenueHistory: [],
  grossMarginHistory: [],
  operatingMarginHistory: [],
  fcfHistory: [],
};

// ── buildInputSpine ──────────────────────────────────────────────────────────

describe("buildInputSpine", () => {
  it("returns all-false when no inputs provided", () => {
    const spine = buildInputSpine(null, "", "");

    expect(spine.hasFinancials).toBe(false);
    expect(spine.hasIndustryData).toBe(false);
    expect(spine.hasImaKnowledge).toBe(false);
    expect(spine.verifiedSources).toEqual([]);
  });

  it("sets hasFinancials when financials provided", () => {
    const spine = buildInputSpine(MOCK_FINANCIALS, "", "");

    expect(spine.hasFinancials).toBe(true);
    expect(spine.hasIndustryData).toBe(false);
    expect(spine.hasImaKnowledge).toBe(false);
    expect(spine.verifiedSources).toHaveLength(1);
    expect(spine.verifiedSources[0]).toContain("NVIDIA Corporation");
    expect(spine.verifiedSources[0]).toContain("NVDA");
    // Redline: must NOT contain vendor names
    expect(spine.verifiedSources[0]).not.toMatch(/Yahoo/i);
  });

  it("sets hasIndustryData when industryData provided", () => {
    const spine = buildInputSpine(null, "产业: AI 芯片\nETF: SOXX", "");

    expect(spine.hasFinancials).toBe(false);
    expect(spine.hasIndustryData).toBe(true);
    expect(spine.hasImaKnowledge).toBe(false);
    expect(spine.verifiedSources).toEqual(["产业 ETF 成分股数据"]);
  });

  it("sets hasImaKnowledge when imaContext provided", () => {
    const spine = buildInputSpine(null, "", "Some IMA knowledge context");

    expect(spine.hasFinancials).toBe(false);
    expect(spine.hasIndustryData).toBe(false);
    expect(spine.hasImaKnowledge).toBe(true);
    expect(spine.verifiedSources).toEqual(["IMA 知识库文献"]);
  });

  it("populates all sources when all inputs provided", () => {
    const spine = buildInputSpine(MOCK_FINANCIALS, "产业数据", "IMA 知识");

    expect(spine.hasFinancials).toBe(true);
    expect(spine.hasIndustryData).toBe(true);
    expect(spine.hasImaKnowledge).toBe(true);
    expect(spine.verifiedSources).toHaveLength(3);
  });
});

// ── hasVerifiedInput ─────────────────────────────────────────────────────────

describe("hasVerifiedInput", () => {
  it("returns false when all flags are false (no data → degrade)", () => {
    const spine: InputSpine = {
      hasFinancials: false,
      hasIndustryData: false,
      hasImaKnowledge: false,
      verifiedSources: [],
    };

    expect(hasVerifiedInput(spine)).toBe(false);
  });

  it("returns true when only financials present", () => {
    const spine: InputSpine = {
      hasFinancials: true,
      hasIndustryData: false,
      hasImaKnowledge: false,
      verifiedSources: ["NVIDIA (NVDA) 财务数据 via verified market data"],
    };

    expect(hasVerifiedInput(spine)).toBe(true);
  });

  it("returns true when only industryData present", () => {
    const spine: InputSpine = {
      hasFinancials: false,
      hasIndustryData: true,
      hasImaKnowledge: false,
      verifiedSources: ["产业 ETF 成分股数据"],
    };

    expect(hasVerifiedInput(spine)).toBe(true);
  });

  it("returns true when only imaKnowledge present", () => {
    const spine: InputSpine = {
      hasFinancials: false,
      hasIndustryData: false,
      hasImaKnowledge: true,
      verifiedSources: ["IMA 知识库文献"],
    };

    expect(hasVerifiedInput(spine)).toBe(true);
  });

  it("returns true when all inputs present", () => {
    const spine: InputSpine = {
      hasFinancials: true,
      hasIndustryData: true,
      hasImaKnowledge: true,
      verifiedSources: ["a", "b", "c"],
    };

    expect(hasVerifiedInput(spine)).toBe(true);
  });
});
