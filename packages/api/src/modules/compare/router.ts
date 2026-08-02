import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { auth } from "@workspace/auth/server";
import { and, desc, eq, inArray } from "@workspace/db";
import { ledgerJudgment } from "@workspace/db/schema";
import { db } from "@workspace/db/server";

import {
  cachedFetchYahooFinance,
  sanitizeFinancialMetrics,
} from "../report/data-sources";

import type { FinancialMetrics } from "@workspace/shared/types/report";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CompareDimension {
  key: string;
  label: string;
  /** Per-ticker values. null = honest empty (data missing). */
  values: Record<string, string | null>;
  /** Per-ticker raw numeric values for potential sorting. */
  rawValues: Record<string, number | null>;
  /** Per-ticker period labels (e.g. "Q2 2025"). */
  periodLabels: Record<string, string | null>;
  /** Whether this dimension has a period mismatch across tickers. */
  periodMismatch: boolean;
  /** Whether this dimension is a cross-currency ratio (incomparable). */
  crossCurrencyBlocked: boolean;
  /** Category for visual grouping. */
  category: "judgment" | "financial" | "valuation" | "cashflow";
}

export interface CompareTickerData {
  ticker: string;
  companyName: string;
  currency: string;
  financialCurrency: string | undefined;
  hasJudgment: boolean;
  judgmentError: string | null;
}

export interface CompareResponse {
  ok: boolean;
  tickers: CompareTickerData[];
  dimensions: CompareDimension[];
  /** True if any ticker has a different financialCurrency than others. */
  crossCurrencyWarning: boolean;
  currencies: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const getUser = async (headers: Headers) => {
  const session = await auth.api.getSession({ headers });
  return session?.user ?? null;
};

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

/** fmtCompactNum with currency prefix for absolute monetary values. */
function fmtCompactMoney(
  value: number | null | undefined,
  currency: string,
): string | null {
  const compact = fmtCompactNum(value);
  if (compact == null) return null;
  // Known currency symbols
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CNY: "¥",
    KRW: "₩",
  };
  const sym = symbols[currency];
  if (sym) return `${sym}${compact}`;
  // Unknown currency: use ISO code prefix (e.g., "HKD 1.50B", "TWD 500M")
  return `${currency} ${compact}`;
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

/** Get last non-null period from a specific history array. */
function lastPeriod(
  history: Array<{ period: string; value: number | null }>,
): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]!.value != null) return history[i]!.period;
  }
  return null;
}

// ── Dimension builders ───────────────────────────────────────────────────────

interface JudgmentData {
  judgment: string;
  keyNumber: string;
  wrongIf: string;
  metric: string | null;
  trigger: string | null;
  checkAfter: string | null;
  tqsScore: number | null;
  tqsTier: string | null;
}

function buildJudgmentDimensions(
  tickerData: Record<string, JudgmentData | null>,
  tickers: string[],
): CompareDimension[] {
  const dims: CompareDimension[] = [];

  // Current Judgment
  const judgmentValues: Record<string, string | null> = {};
  const judgmentRaw: Record<string, number | null> = {};
  const judgmentPeriods: Record<string, string | null> = {};
  for (const t of tickers) {
    const j = tickerData[t];
    judgmentValues[t] = j?.judgment ?? null;
    judgmentRaw[t] = null;
    judgmentPeriods[t] = j?.checkAfter
      ? new Date(j.checkAfter).toISOString().slice(0, 10)
      : null;
  }
  dims.push({
    key: "currentJudgment",
    label: "Current Judgment",
    values: judgmentValues,
    rawValues: judgmentRaw,
    periodLabels: judgmentPeriods,
    periodMismatch: false,
    crossCurrencyBlocked: false,
    category: "judgment",
  });

  // Core Growth Factor (from keyNumber)
  const growthValues: Record<string, string | null> = {};
  const growthRaw: Record<string, number | null> = {};
  const growthPeriods: Record<string, string | null> = {};
  for (const t of tickers) {
    const j = tickerData[t];
    growthValues[t] = j?.keyNumber ?? null;
    growthRaw[t] = null;
    growthPeriods[t] = null;
  }
  dims.push({
    key: "coreGrowthFactor",
    label: "Core Growth Factor",
    values: growthValues,
    rawValues: growthRaw,
    periodLabels: growthPeriods,
    periodMismatch: false,
    crossCurrencyBlocked: false,
    category: "judgment",
  });

  // Max Invalidation Condition (wrongIf)
  const wrongIfValues: Record<string, string | null> = {};
  const wrongIfRaw: Record<string, number | null> = {};
  const wrongIfPeriods: Record<string, string | null> = {};
  for (const t of tickers) {
    const j = tickerData[t];
    wrongIfValues[t] = j?.wrongIf ?? null;
    wrongIfRaw[t] = null;
    wrongIfPeriods[t] = null;
  }
  dims.push({
    key: "maxInvalidation",
    label: "Max Invalidation Condition",
    values: wrongIfValues,
    rawValues: wrongIfRaw,
    periodLabels: wrongIfPeriods,
    periodMismatch: false,
    crossCurrencyBlocked: false,
    category: "judgment",
  });

  // TQS
  const tqsValues: Record<string, string | null> = {};
  const tqsRaw: Record<string, number | null> = {};
  const tqsPeriods: Record<string, string | null> = {};
  for (const t of tickers) {
    const j = tickerData[t];
    if (j?.tqsScore != null && j?.tqsTier) {
      tqsValues[t] = `${j.tqsScore} (${j.tqsTier})`;
      tqsRaw[t] = j.tqsScore;
    } else {
      tqsValues[t] = null;
      tqsRaw[t] = null;
    }
    tqsPeriods[t] = null;
  }
  dims.push({
    key: "tqs",
    label: "TQS",
    values: tqsValues,
    rawValues: tqsRaw,
    periodLabels: tqsPeriods,
    periodMismatch: false,
    crossCurrencyBlocked: false,
    category: "judgment",
  });

  // Key Period (checkAfter)
  const keyPeriodValues: Record<string, string | null> = {};
  const keyPeriodRaw: Record<string, number | null> = {};
  const keyPeriodPeriods: Record<string, string | null> = {};
  for (const t of tickers) {
    const j = tickerData[t];
    if (j?.checkAfter) {
      const d = new Date(j.checkAfter);
      keyPeriodValues[t] = d.toISOString().slice(0, 10);
      keyPeriodRaw[t] = d.getTime();
    } else {
      keyPeriodValues[t] = null;
      keyPeriodRaw[t] = null;
    }
    keyPeriodPeriods[t] = null;
  }
  dims.push({
    key: "keyPeriod",
    label: "Key Period",
    values: keyPeriodValues,
    rawValues: keyPeriodRaw,
    periodLabels: keyPeriodPeriods,
    periodMismatch: false,
    crossCurrencyBlocked: false,
    category: "judgment",
  });

  return dims;
}

function buildFinancialDimensions(
  metricsMap: Record<string, FinancialMetrics | null>,
  tickers: string[],
): CompareDimension[] {
  const dims: CompareDimension[] = [];

  // Helper to extract a dimension
  const addDim = (
    key: string,
    label: string,
    extractor: (m: FinancialMetrics) => {
      value: string | null;
      raw: number | null;
      period: string | null;
    },
    category: CompareDimension["category"],
    opts?: { isRatio?: boolean },
  ) => {
    const values: Record<string, string | null> = {};
    const rawValues: Record<string, number | null> = {};
    const periodLabels: Record<string, string | null> = {};
    for (const t of tickers) {
      const m = metricsMap[t];
      if (!m) {
        values[t] = null;
        rawValues[t] = null;
        periodLabels[t] = null;
        continue;
      }
      const result = extractor(m);
      values[t] = result.value;
      rawValues[t] = result.raw;
      periodLabels[t] = result.period;
    }

    // Check period mismatch
    const periods = Object.values(periodLabels).filter(Boolean);
    const uniquePeriods = new Set(periods);
    const periodMismatch = periods.length > 1 && uniquePeriods.size > 1;

    // Check cross-currency for ratio metrics
    const currencies = tickers
      .map((t) => metricsMap[t]?.financialCurrency ?? metricsMap[t]?.currency)
      .filter(Boolean);
    const uniqueCurrencies = new Set(currencies);
    const crossCurrencyBlocked =
      (opts?.isRatio ?? false) && uniqueCurrencies.size > 1;

    dims.push({
      key,
      label,
      values,
      rawValues,
      periodLabels,
      periodMismatch,
      crossCurrencyBlocked,
      category,
    });
  };

  addDim(
    "currentPrice",
    "Current Price",
    (m) => ({
      value: fmtMoney(m.currentPrice, m.currency),
      raw: m.currentPrice,
      period: null, // snapshot, no quarterly period
    }),
    "financial",
  );

  addDim(
    "marketCap",
    "Market Cap",
    (m) => ({
      value: fmtCompactMoney(m.marketCap, m.currency),
      raw: m.marketCap,
      period: null, // snapshot, no quarterly period
    }),
    "financial",
  );

  addDim(
    "revenueGrowthYoy",
    "Revenue Growth YoY",
    (m) => ({
      value: fmtNum(m.revenueGrowthYoy, "%"),
      raw: m.revenueGrowthYoy,
      period: lastPeriod(m.revenueHistory),
    }),
    "financial",
  );

  addDim(
    "grossMargin",
    "Gross Margin",
    (m) => ({
      value: fmtNum(m.grossMargin, "%"),
      raw: m.grossMargin,
      period: lastPeriod(m.grossMarginHistory),
    }),
    "financial",
  );

  addDim(
    "operatingMargin",
    "Operating Margin",
    (m) => ({
      value: fmtNum(m.operatingMargin, "%"),
      raw: m.operatingMargin,
      period: lastPeriod(m.operatingMarginHistory),
    }),
    "financial",
  );

  addDim(
    "netMargin",
    "Net Margin",
    (m) => ({
      value: fmtNum(m.netMargin, "%"),
      raw: m.netMargin,
      period: lastPeriod(m.operatingMarginHistory), // same income statement source
    }),
    "financial",
  );

  addDim(
    "eps",
    "EPS",
    (m) => ({
      value: fmtMoney(m.eps, m.currency),
      raw: m.eps,
      period: null, // trailing, no quarterly period
    }),
    "financial",
  );

  addDim(
    "freeCashFlow",
    "Free Cash Flow",
    (m) => ({
      value: fmtCompactMoney(m.freeCashFlow, m.currency),
      raw: m.freeCashFlow,
      period: lastPeriod(m.fcfHistory),
    }),
    "cashflow",
  );

  addDim(
    "peRatio",
    "P/E Ratio",
    (m) => ({
      value: fmtRatio(m.peRatio),
      raw: m.peRatio,
      period: null, // trailing, no quarterly period
    }),
    "valuation",
    { isRatio: true },
  );

  addDim(
    "evEbitda",
    "EV/EBITDA",
    (m) => ({
      value: fmtRatio(m.evEbitda),
      raw: m.evEbitda,
      period: null, // trailing, no quarterly period
    }),
    "valuation",
    { isRatio: true },
  );

  return dims;
}

// ── Router ───────────────────────────────────────────────────────────────────

export const compareRouter = new Hono().get(
  "/",
  zValidator(
    "query",
    z.object({
      tickers: z
        .string()
        .min(1)
        .transform((s) => [
          ...new Set(
            s
              .split(",")
              .map((t) => t.trim().toUpperCase())
              .filter(Boolean),
          ),
        ])
        .refine(
          (arr) => arr.length >= 2 && arr.length <= 4,
          "Provide 2–4 unique tickers",
        ),
    }),
  ),
  async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) {
      return c.json({ ok: false, message: "Sign in required." }, 401);
    }

    const { tickers } = c.req.valid("query");

    // 1. Fetch financial data for all tickers in parallel
    const metricsResults = await Promise.allSettled(
      tickers.map(async (ticker) => {
        const raw = await cachedFetchYahooFinance(ticker);
        const { metrics } = sanitizeFinancialMetrics(raw);
        return metrics;
      }),
    );

    const metricsMap: Record<string, FinancialMetrics | null> = {};
    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      if (!ticker) continue;
      const result = metricsResults[i];
      metricsMap[ticker] =
        result && result.status === "fulfilled" ? result.value : null;
    }

    // 2. Fetch latest judgments for all tickers
    const judgments = await db
      .select()
      .from(ledgerJudgment)
      .where(
        and(
          eq(ledgerJudgment.userId, user.id),
          inArray(ledgerJudgment.ticker, tickers),
        ),
      )
      .orderBy(desc(ledgerJudgment.publishedAt));

    // Group by ticker, take latest
    const judgmentMap: Record<string, (typeof judgments)[0] | null> = {};
    for (const t of tickers) {
      judgmentMap[t] = null;
    }
    for (const j of judgments) {
      if (!judgmentMap[j.ticker]) {
        judgmentMap[j.ticker] = j;
      }
    }

    // 3. Build ticker data
    const tickerDataArr: CompareTickerData[] = tickers.map((t) => {
      const m = metricsMap[t];
      const j = judgmentMap[t];
      return {
        ticker: t,
        companyName: m?.companyName ?? t,
        currency: m?.currency ?? "USD",
        financialCurrency: m?.financialCurrency,
        hasJudgment: j != null,
        judgmentError: j ? null : "No judgment recorded",
      };
    });

    // 4. Build dimensions
    const judgmentDims = buildJudgmentDimensions(
      Object.fromEntries(
        tickers.map((t) => {
          const j = judgmentMap[t];
          return [
            t,
            j
              ? {
                  judgment: j.judgment,
                  keyNumber: j.keyNumber,
                  wrongIf: j.wrongIf,
                  metric: j.metric,
                  trigger: j.trigger,
                  checkAfter: j.checkAfter?.toISOString() ?? null,
                  tqsScore: j.tqsScore,
                  tqsTier: j.tqsTier,
                }
              : null,
          ];
        }),
      ),
      tickers,
    );

    const financialDims = buildFinancialDimensions(metricsMap, tickers);

    const allDimensions = [...judgmentDims, ...financialDims];

    // 5. Cross-currency warning
    const currencies = tickerDataArr
      .map((t) => t.financialCurrency ?? t.currency)
      .filter(Boolean);
    const uniqueCurrencies = new Set(currencies);
    const crossCurrencyWarning = uniqueCurrencies.size > 1;

    // 6. Filter out dimensions where ALL tickers have null values
    const visibleDimensions = allDimensions.filter((dim) => {
      const hasAnyValue = Object.values(dim.values).some((v) => v != null);
      return hasAnyValue;
    });

    const response: CompareResponse = {
      ok: true,
      tickers: tickerDataArr,
      dimensions: visibleDimensions,
      crossCurrencyWarning,
      currencies: [...uniqueCurrencies],
    };

    return c.json(response);
  },
);
