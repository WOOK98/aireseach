import type {
  FinancialMetrics,
  QuarterlyPoint,
} from "@workspace/shared/types/report";

const YF_BASE = "https://query2.finance.yahoo.com/v10/finance/quoteSummary";

const YF_MODULES = [
  "assetProfile",
  "price",
  "summaryDetail",
  "financialData",
  "defaultKeyStatistics",
  "incomeStatementHistory",
  "incomeStatementHistoryQuarterly",
  "cashflowStatementHistoryQuarterly",
].join(",");

// ─── Cookie + Crumb management ────────────────────────────────────────────────
let cachedCrumb: string | null = null;
let cachedCookies: string | null = null;
let crumbExpiry = 0;

export async function getYahooCrumb(): Promise<{
  crumb: string | null;
  cookies: string | null;
}> {
  if (cachedCrumb && cachedCookies && Date.now() < crumbExpiry)
    return { crumb: cachedCrumb, cookies: cachedCookies };

  try {
    const cookieRes = await fetch("https://fc.yahoo.com", {
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    const cookies = cookieRes.headers.getSetCookie?.() ?? [];
    const cookieStr = cookies.map((c) => c.split(";")[0]).join("; ");

    const crumbRes = await fetch(
      "https://query2.finance.yahoo.com/v1/test/getcrumb",
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Cookie: cookieStr,
        },
        signal: AbortSignal.timeout(5000),
      },
    );
    const crumb = await crumbRes.text();

    if (crumb && !crumb.includes("error")) {
      cachedCrumb = crumb;
      cachedCookies = cookieStr;
      crumbExpiry = Date.now() + 30 * 60 * 1000; // 30 min cache
      return { crumb, cookies: cookieStr };
    }
  } catch {}
  return { crumb: null, cookies: null };
}

// Yahoo Finance returns raw numbers in a nested structure  // redline-allow: internal module comment
interface YFRaw {
  assetProfile?: {
    longBusinessSummary: string;
    sector: string;
    industry: string;
    exchange: string;
  };
  price?: {
    shortName: string;
    longName: string;
    regularMarketPrice: { raw: number };
    regularMarketChange: { raw: number };
    regularMarketChangePercent: { raw: number };
    regularMarketTime: { raw: number };
    regularMarketPreviousClose: { raw: number };
    preMarketChange: { raw: number };
    preMarketChangePercent: { raw: number };
    postMarketChange: { raw: number };
    postMarketChangePercent: { raw: number };
    marketCap: { raw: number };
    currency: string;
    exchangeName: string;
    marketState: string; // "REGULAR" | "PRE" | "POST" | "CLOSED"
    financialCurrency?: string; // reporting currency from financial statements
  };
  financialData?: {
    currentPrice: { raw: number };
    revenueGrowth: { raw: number };
    grossMargins: { raw: number };
    operatingMargins: { raw: number };
    profitMargins: { raw: number };
    totalCash: { raw: number };
    totalDebt: { raw: number };
    freeCashflow: { raw: number };
    revenuePerShare: { raw: number };
    returnOnEquity: { raw: number };
    ebitda: { raw: number };
    targetMeanPrice: { raw: number };
  };
  defaultKeyStatistics?: {
    trailingEps: { raw: number };
    forwardEps: { raw: number };
    trailingPE: { raw: number };
    forwardPE: { raw: number };
    priceToBook: { raw: number };
    priceToSalesTrailing12Months: { raw: number };
    enterpriseToEbitda: { raw: number };
    earningsQuarterlyGrowth: { raw: number };
  };
  incomeStatementHistoryQuarterly?: {
    incomeStatementHistory: Array<{
      endDate: { fmt: string };
      totalRevenue: { raw: number };
      grossProfit: { raw: number };
      ebit: { raw: number };
      netIncome: { raw: number };
    }>;
  };
  cashflowStatementHistoryQuarterly?: {
    cashflowStatements: Array<{
      endDate: { fmt: string };
      totalCashFromOperatingActivities: { raw: number };
      capitalExpenditures: { raw: number };
    }>;
  };
}

interface YFChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: string;
        financialCurrency?: string;
        symbol?: string;
        exchangeName?: string;
        fullExchangeName?: string;
        regularMarketPrice?: number;
        longName?: string;
        shortName?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
  };
}

function fmtQuarter(dateStr: string): string {
  const d = new Date(dateStr);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

function safe(val: { raw: number } | undefined): number {
  return val?.raw ?? 0;
}

/** Returns null when Yahoo data is missing — distinct from a real zero. */
function safeOrNull(val: { raw: number } | undefined): number | null {
  if (val == null || val.raw == null || !Number.isFinite(val.raw)) return null;
  return val.raw;
}

async function fetchYahooChartMetrics(
  ticker: string,
): Promise<FinancialMetrics> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1mo&range=1y`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance chart returned ${res.status} for ${ticker}`); // redline-allow: server-side error, not user-visible
  }

  const json = (await res.json()) as YFChartResponse;
  const result = json.chart?.result?.[0];
  const meta = result?.meta;

  if (!meta) {
    throw new Error(`No chart data found for ticker: ${ticker}`);
  }

  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const latestClose =
    closes
      .slice()
      .reverse()
      .find((value): value is number => typeof value === "number") ??
    meta.regularMarketPrice ??
    0;
  return {
    ticker: (meta.symbol ?? ticker).toUpperCase(),
    companyName: meta.longName ?? meta.shortName ?? ticker.toUpperCase(),
    exchange: meta.fullExchangeName ?? meta.exchangeName ?? "",
    sector: "",
    industry: "",
    description:
      "Yahoo Finance fundamentals were temporarily unavailable, so this report uses live market price data as a fallback.", // redline-allow: fallback message from existing code
    currentPrice: latestClose,
    marketCap: null,
    currency: meta.currency ?? "USD",
    financialCurrency: meta.currency ?? "USD", // chart fallback has no separate financialCurrency
    priceChange: null,
    priceChangePercent: null,
    marketState: "CLOSED",
    revenue: null,
    revenueGrowthYoy: null,
    grossProfit: null,
    grossMargin: null,
    operatingIncome: null,
    operatingMargin: null,
    netIncome: null,
    netMargin: null,
    ebitda: null,
    eps: null,
    epsGrowthYoy: null,
    totalCash: null,
    totalDebt: null,
    netCash: null,
    peRatio: null,
    forwardPE: null,
    pbRatio: null,
    psRatio: null,
    evEbitda: null,
    freeCashFlow: null,
    fcfMargin: null,
    revenueHistory: [],
    grossMarginHistory: [],
    operatingMarginHistory: [],
    fcfHistory: [],
  };
}

export async function fetchYahooFinance(
  ticker: string,
): Promise<FinancialMetrics> {
  const { crumb, cookies } = await getYahooCrumb();

  let url = `${YF_BASE}/${encodeURIComponent(ticker)}?modules=${YF_MODULES}&lang=en-US&region=US`;

  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (compatible; research-bot/1.0)",
    Accept: "application/json",
  };
  if (cookies) {
    headers.Cookie = cookies;
  }
  if (crumb) {
    url += `&crumb=${encodeURIComponent(crumb)}`;
  }

  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    return fetchYahooChartMetrics(ticker);
  }

  const json = (await res.json()) as {
    quoteSummary?: { result?: YFRaw[] };
  };
  const result = json?.quoteSummary?.result?.[0];
  if (!result) throw new Error(`No data found for ticker: ${ticker}`);

  return parseYahooQuoteSummary(ticker, result);
}

/**
 * Parse a market-data quoteSummary result into FinancialMetrics.
 * Exported for testing — no I/O, pure data transformation.
 */
export function parseYahooQuoteSummary(
  ticker: string,
  d: YFRaw,
): FinancialMetrics {
  const p = d.price;
  const fd = d.financialData;
  const ks = d.defaultKeyStatistics;
  const ap = d.assetProfile;

  const currentPrice = safe(p?.regularMarketPrice);
  const totalCash = safeOrNull(fd?.totalCash);
  const totalDebt = safeOrNull(fd?.totalDebt);
  const grossMarginRaw = safeOrNull(fd?.grossMargins);
  const grossMargin = grossMarginRaw != null ? grossMarginRaw * 100 : null;
  const operatingMarginRaw = safeOrNull(fd?.operatingMargins);
  const operatingMargin =
    operatingMarginRaw != null ? operatingMarginRaw * 100 : null;
  const netMarginRaw = safeOrNull(fd?.profitMargins);
  const netMargin = netMarginRaw != null ? netMarginRaw * 100 : null;
  const fcf = safeOrNull(fd?.freeCashflow);
  const ebitdaVal = safeOrNull(fd?.ebitda);
  const operatingMarginsVal = safeOrNull(fd?.operatingMargins);
  const revenue =
    ebitdaVal != null &&
    operatingMarginsVal != null &&
    operatingMarginsVal !== 0
      ? ebitdaVal / Math.abs(operatingMarginsVal)
      : null;
  const fcfMargin =
    revenue != null && revenue > 0 && fcf != null
      ? (fcf / revenue) * 100
      : null;

  // Build quarterly history (most recent last → oldest first)
  const qIncome = (
    d.incomeStatementHistoryQuarterly?.incomeStatementHistory ?? []
  )
    .slice()
    .reverse();

  const revenueHistory: QuarterlyPoint[] = qIncome.map((q) => {
    const raw = safeOrNull(q.totalRevenue);
    return {
      period: fmtQuarter(q.endDate.fmt),
      value: raw != null ? Math.round(raw / 1e6) : null,
    };
  });

  const grossMarginHistory: QuarterlyPoint[] = qIncome.map((q) => {
    const rev = safeOrNull(q.totalRevenue);
    const gp = safeOrNull(q.grossProfit);
    return {
      period: fmtQuarter(q.endDate.fmt),
      value:
        rev != null && rev > 0 && gp != null
          ? Math.round((gp / rev) * 1000) / 10
          : null,
    };
  });

  const operatingMarginHistory: QuarterlyPoint[] = qIncome.map((q) => {
    const rev = safeOrNull(q.totalRevenue);
    const op = safeOrNull(q.ebit);
    return {
      period: fmtQuarter(q.endDate.fmt),
      value:
        rev != null && rev > 0 && op != null
          ? Math.round((op / rev) * 1000) / 10
          : null,
    };
  });

  const qCF = (d.cashflowStatementHistoryQuarterly?.cashflowStatements ?? [])
    .slice()
    .reverse();

  const fcfHistory: QuarterlyPoint[] = qCF.map((q) => {
    const ops = safeOrNull(q.totalCashFromOperatingActivities);
    const capex = safeOrNull(q.capitalExpenditures);
    return {
      period: fmtQuarter(q.endDate.fmt),
      value:
        ops != null && capex != null ? Math.round((ops + capex) / 1e6) : null,
    };
  });

  return {
    ticker: ticker.toUpperCase(),
    companyName: p?.longName ?? p?.shortName ?? ticker,
    exchange: p?.exchangeName ?? ap?.exchange ?? "",
    sector: ap?.sector ?? "",
    industry: ap?.industry ?? "",
    description: ap?.longBusinessSummary ?? "",
    currentPrice,
    marketCap: safeOrNull(p?.marketCap),
    currency: p?.currency ?? "USD",
    financialCurrency: p?.financialCurrency ?? p?.currency ?? "USD",
    priceChange: safe(p?.regularMarketChange) || null,
    priceChangePercent: safe(p?.regularMarketChangePercent) || null,
    marketState: p?.marketState ?? "CLOSED",
    revenue,
    revenueGrowthYoy:
      safeOrNull(fd?.revenueGrowth) != null
        ? safeOrNull(fd?.revenueGrowth)! * 100
        : null,
    grossProfit: qIncome[0] ? safeOrNull(qIncome[0].grossProfit) : null,
    grossMargin,
    operatingIncome: qIncome[0] ? safeOrNull(qIncome[0].ebit) : null,
    operatingMargin,
    netIncome: qIncome[0] ? safeOrNull(qIncome[0].netIncome) : null,
    netMargin,
    ebitda: ebitdaVal,
    eps: safeOrNull(ks?.trailingEps),
    epsGrowthYoy:
      safeOrNull(ks?.earningsQuarterlyGrowth) != null
        ? safeOrNull(ks?.earningsQuarterlyGrowth)! * 100
        : null,
    totalCash,
    totalDebt,
    netCash:
      totalCash != null && totalDebt != null ? totalCash - totalDebt : null,
    peRatio: safeOrNull(ks?.trailingPE),
    forwardPE: safeOrNull(ks?.forwardPE),
    pbRatio: safeOrNull(ks?.priceToBook),
    psRatio: safeOrNull(ks?.priceToSalesTrailing12Months),
    evEbitda: safeOrNull(ks?.enterpriseToEbitda),
    freeCashFlow: fcf,
    fcfMargin,
    revenueHistory,
    grossMarginHistory,
    operatingMarginHistory,
    fcfHistory,
  };
}
