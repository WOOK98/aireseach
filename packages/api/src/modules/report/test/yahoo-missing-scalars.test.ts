/**
 * #57 — Production path: missing Yahoo Finance fields → null (not 0)
 *
 * Tests parseYahooQuoteSummary (the pure parsing function extracted from
 * fetchYahooFinance) to verify that missing Yahoo fields produce null,
 * and real zeros are preserved.
 */

import { describe, expect, it } from "vitest";

import { parseYahooQuoteSummary } from "../yahoo-finance";

// ── Helpers ──────────────────────────────────────────────────────────────────

type YFRaw = Parameters<typeof parseYahooQuoteSummary>[1];

const FULL_FD = {
  currentPrice: { raw: 150 },
  revenueGrowth: { raw: 0.12 },
  grossMargins: { raw: 0.45 },
  operatingMargins: { raw: 0.3 },
  profitMargins: { raw: 0.25 },
  totalCash: { raw: 50e9 },
  totalDebt: { raw: 30e9 },
  freeCashflow: { raw: 80e9 },
  revenuePerShare: { raw: 20 },
  returnOnEquity: { raw: 0.5 },
  ebitda: { raw: 100e9 },
  targetMeanPrice: { raw: 175 },
};

const FULL_KS = {
  trailingEps: { raw: 6.5 },
  forwardEps: { raw: 7.2 },
  trailingPE: { raw: 23 },
  forwardPE: { raw: 21 },
  priceToBook: { raw: 45 },
  priceToSalesTrailing12Months: { raw: 12 },
  enterpriseToEbitda: { raw: 20 },
  earningsQuarterlyGrowth: { raw: 0.25 },
};

/** Remove a key from an object (returns a new copy without that key). */
function without<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  key: K,
): Omit<T, K> {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}

function buildRaw(opts: {
  fd?: Record<string, { raw: number } | undefined>;
  ks?: Record<string, { raw: number } | undefined>;
  omitMarketCap?: boolean;
}): YFRaw {
  const fd = (opts.fd ?? FULL_FD) as YFRaw["financialData"];
  const ks = (opts.ks ?? FULL_KS) as YFRaw["defaultKeyStatistics"];

  const price: Record<string, unknown> = {
    shortName: "Test Corp",
    longName: "Test Corporation",
    regularMarketPrice: { raw: 150 },
    regularMarketChange: { raw: 2.5 },
    regularMarketChangePercent: { raw: 0.017 },
    regularMarketTime: { raw: Date.now() / 1000 },
    regularMarketPreviousClose: { raw: 147.5 },
    preMarketChange: { raw: 0 },
    preMarketChangePercent: { raw: 0 },
    postMarketChange: { raw: 0 },
    postMarketChangePercent: { raw: 0 },
    currency: "USD",
    exchangeName: "NMS",
    marketState: "CLOSED",
  };
  if (!opts.omitMarketCap) {
    price.marketCap = { raw: 2.5e12 };
  }

  return {
    price: price as YFRaw["price"],
    financialData: fd,
    defaultKeyStatistics: ks,
    assetProfile: {
      longBusinessSummary: "A test company.",
      sector: "Technology",
      industry: "Semiconductors",
      exchange: "NMS",
    },
    incomeStatementHistoryQuarterly: {
      incomeStatementHistory: [
        {
          endDate: { fmt: "2026-03-31" },
          totalRevenue: { raw: 100e9 },
          grossProfit: { raw: 45e9 },
          ebit: { raw: 30e9 },
          netIncome: { raw: 25e9 },
        },
      ],
    },
    cashflowStatementHistoryQuarterly: {
      cashflowStatements: [
        {
          endDate: { fmt: "2026-03-31" },
          totalCashFromOperatingActivities: { raw: 35e9 },
          capitalExpenditures: { raw: -10e9 },
        },
      ],
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("#57 production path — missing scalars → null", () => {
  describe("missing fields return null (not 0)", () => {
    it("grossMargin = null when grossMargins omitted", () => {
      const r = parseYahooQuoteSummary(
        "TEST",
        buildRaw({ fd: without(FULL_FD, "grossMargins") }),
      );
      expect(r.grossMargin).toBeNull();
    });

    it("operatingMargin = null when operatingMargins omitted", () => {
      const r = parseYahooQuoteSummary(
        "TEST",
        buildRaw({ fd: without(FULL_FD, "operatingMargins") }),
      );
      expect(r.operatingMargin).toBeNull();
    });

    it("netMargin = null when profitMargins omitted", () => {
      const r = parseYahooQuoteSummary(
        "TEST",
        buildRaw({ fd: without(FULL_FD, "profitMargins") }),
      );
      expect(r.netMargin).toBeNull();
    });

    it("marketCap = null when marketCap omitted from price", () => {
      const r = parseYahooQuoteSummary(
        "TEST",
        buildRaw({ omitMarketCap: true }),
      );
      expect(r.marketCap).toBeNull();
    });

    it("eps = null when trailingEps omitted", () => {
      const r = parseYahooQuoteSummary(
        "TEST",
        buildRaw({ ks: without(FULL_KS, "trailingEps") }),
      );
      expect(r.eps).toBeNull();
    });

    it("ebitda = null when ebitda omitted", () => {
      const r = parseYahooQuoteSummary(
        "TEST",
        buildRaw({ fd: without(FULL_FD, "ebitda") }),
      );
      expect(r.ebitda).toBeNull();
    });

    it("freeCashFlow = null when freeCashflow omitted", () => {
      const r = parseYahooQuoteSummary(
        "TEST",
        buildRaw({ fd: without(FULL_FD, "freeCashflow") }),
      );
      expect(r.freeCashFlow).toBeNull();
    });

    it("revenueGrowthYoy = null when revenueGrowth omitted", () => {
      const r = parseYahooQuoteSummary(
        "TEST",
        buildRaw({ fd: without(FULL_FD, "revenueGrowth") }),
      );
      expect(r.revenueGrowthYoy).toBeNull();
    });

    it("peRatio = null when trailingPE omitted", () => {
      const r = parseYahooQuoteSummary(
        "TEST",
        buildRaw({ ks: without(FULL_KS, "trailingPE") }),
      );
      expect(r.peRatio).toBeNull();
    });

    it("fcfMargin = null when freeCashflow omitted", () => {
      const r = parseYahooQuoteSummary(
        "TEST",
        buildRaw({ fd: without(FULL_FD, "freeCashflow") }),
      );
      expect(r.fcfMargin).toBeNull();
    });
  });

  describe("real values are preserved", () => {
    it("preserves real values when Yahoo provides them", () => {
      const r = parseYahooQuoteSummary("TEST", buildRaw({}));
      expect(r.grossMargin).toBe(45);
      expect(r.operatingMargin).toBe(30);
      expect(r.netMargin).toBe(25);
      expect(r.marketCap).toBe(2.5e12);
      expect(r.eps).toBe(6.5);
      expect(r.ebitda).toBe(100e9);
      expect(r.freeCashFlow).toBe(80e9);
      expect(r.revenueGrowthYoy).toBeCloseTo(12, 0);
      expect(r.peRatio).toBe(23);
    });

    it("preserves genuine 0 margin (not converted to null)", () => {
      const r = parseYahooQuoteSummary(
        "TEST",
        buildRaw({ fd: { ...FULL_FD, grossMargins: { raw: 0 } } }),
      );
      expect(r.grossMargin).toBe(0);
      expect(r.grossMargin).not.toBeNull();
    });
  });

  describe("null vs 0 distinguishability", () => {
    it("null ≠ 0 for all affected fields", () => {
      const r = parseYahooQuoteSummary(
        "TEST",
        buildRaw({
          fd: without(
            without(
              without(
                without(without(FULL_FD, "grossMargins"), "operatingMargins"),
                "profitMargins",
              ),
              "ebitda",
            ),
            "freeCashflow",
          ),
          ks: without(without(FULL_KS, "trailingEps"), "trailingPE"),
          omitMarketCap: true,
        }),
      );

      expect(r.grossMargin).toBeNull();
      expect(r.operatingMargin).toBeNull();
      expect(r.netMargin).toBeNull();
      expect(r.ebitda).toBeNull();
      expect(r.eps).toBeNull();
      expect(r.freeCashFlow).toBeNull();
      expect(r.marketCap).toBeNull();
      expect(r.fcfMargin).toBeNull();
      expect(r.peRatio).toBeNull();
    });
  });
});
