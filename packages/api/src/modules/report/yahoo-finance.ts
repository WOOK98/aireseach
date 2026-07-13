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

// Yahoo Finance returns raw numbers in a nested structure
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

async function fetchYahooChartMetrics(
  ticker: string,
): Promise<FinancialMetrics> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1mo&range=1y`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance chart returned ${res.status} for ${ticker}`);
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
  const firstClose = closes.find(
    (value): value is number => typeof value === "number",
  );
  const revenueGrowthYoy =
    firstClose && firstClose !== 0
      ? ((latestClose - firstClose) / firstClose) * 100
      : 0;

  return {
    ticker: (meta.symbol ?? ticker).toUpperCase(),
    companyName: meta.longName ?? meta.shortName ?? ticker.toUpperCase(),
    exchange: meta.fullExchangeName ?? meta.exchangeName ?? "",
    sector: "",
    industry: "",
    description:
      "Yahoo Finance fundamentals were temporarily unavailable, so this report uses live market price data as a fallback.",
    currentPrice: latestClose,
    marketCap: 0,
    currency: meta.currency ?? "USD",
    priceChange: null,
    priceChangePercent: null,
    marketState: "CLOSED",
    revenue: 0,
    revenueGrowthYoy,
    grossProfit: 0,
    grossMargin: 0,
    operatingIncome: 0,
    operatingMargin: 0,
    netIncome: 0,
    netMargin: 0,
    ebitda: 0,
    eps: 0,
    epsGrowthYoy: 0,
    totalCash: 0,
    totalDebt: 0,
    netCash: 0,
    peRatio: null,
    forwardPE: null,
    pbRatio: null,
    psRatio: null,
    evEbitda: null,
    freeCashFlow: 0,
    fcfMargin: 0,
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

  const d = result;
  const p = d.price;
  const fd = d.financialData;
  const ks = d.defaultKeyStatistics;
  const ap = d.assetProfile;

  const currentPrice = safe(p?.regularMarketPrice);
  const totalCash = safe(fd?.totalCash);
  const totalDebt = safe(fd?.totalDebt);
  const grossMargin = safe(fd?.grossMargins) * 100;
  const operatingMargin = safe(fd?.operatingMargins) * 100;
  const netMargin = safe(fd?.profitMargins) * 100;
  const fcf = safe(fd?.freeCashflow);
  const revenue =
    fd?.ebitda && fd?.grossMargins
      ? safe(fd.ebitda) / Math.max(safe(fd.operatingMargins), 0.01)
      : 0;
  const fcfMargin = revenue > 0 ? (fcf / revenue) * 100 : 0;

  // Build quarterly history (most recent last → oldest first)
  const qIncome = (
    d.incomeStatementHistoryQuarterly?.incomeStatementHistory ?? []
  )
    .slice()
    .reverse();

  const revenueHistory: QuarterlyPoint[] = qIncome.map((q) => ({
    period: fmtQuarter(q.endDate.fmt),
    value: Math.round(safe(q.totalRevenue) / 1e6), // in millions
  }));

  const grossMarginHistory: QuarterlyPoint[] = qIncome.map((q) => {
    const rev = safe(q.totalRevenue);
    const gp = safe(q.grossProfit);
    return {
      period: fmtQuarter(q.endDate.fmt),
      value: rev > 0 ? Math.round((gp / rev) * 1000) / 10 : 0, // 1dp %
    };
  });

  const operatingMarginHistory: QuarterlyPoint[] = qIncome.map((q) => {
    const rev = safe(q.totalRevenue);
    const op = safe(q.ebit);
    return {
      period: fmtQuarter(q.endDate.fmt),
      value: rev > 0 ? Math.round((op / rev) * 1000) / 10 : 0,
    };
  });

  const qCF = (d.cashflowStatementHistoryQuarterly?.cashflowStatements ?? [])
    .slice()
    .reverse();

  const fcfHistory: QuarterlyPoint[] = qCF.map((q) => ({
    period: fmtQuarter(q.endDate.fmt),
    value: Math.round(
      (safe(q.totalCashFromOperatingActivities) + safe(q.capitalExpenditures)) /
        1e6,
    ),
  }));

  return {
    ticker: ticker.toUpperCase(),
    companyName: p?.longName ?? p?.shortName ?? ticker,
    exchange: p?.exchangeName ?? ap?.exchange ?? "",
    sector: ap?.sector ?? "",
    industry: ap?.industry ?? "",
    description: ap?.longBusinessSummary ?? "",
    currentPrice,
    marketCap: safe(p?.marketCap),
    currency: p?.currency ?? "USD",
    priceChange: safe(p?.regularMarketChange) || null,
    priceChangePercent: safe(p?.regularMarketChangePercent) || null,
    marketState: p?.marketState ?? "CLOSED",
    revenue,
    revenueGrowthYoy: safe(fd?.revenueGrowth) * 100,
    grossProfit: 0,
    grossMargin,
    operatingIncome: 0,
    operatingMargin,
    netIncome: 0,
    netMargin,
    ebitda: safe(fd?.ebitda),
    eps: safe(ks?.trailingEps),
    epsGrowthYoy: safe(ks?.earningsQuarterlyGrowth) * 100,
    totalCash,
    totalDebt,
    netCash: totalCash - totalDebt,
    peRatio: safe(ks?.trailingPE) || null,
    forwardPE: safe(ks?.forwardPE) || null,
    pbRatio: safe(ks?.priceToBook) || null,
    psRatio: safe(ks?.priceToSalesTrailing12Months) || null,
    evEbitda: safe(ks?.enterpriseToEbitda) || null,
    freeCashFlow: fcf,
    fcfMargin,
    revenueHistory,
    grossMarginHistory,
    operatingMarginHistory,
    fcfHistory,
  };
}
