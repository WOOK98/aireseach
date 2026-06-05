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
    marketCap: { raw: number };
    currency: string;
    exchangeName: string;
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

function fmtQuarter(dateStr: string): string {
  const d = new Date(dateStr);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

function safe(val: { raw: number } | undefined): number {
  return val?.raw ?? 0;
}

export async function fetchYahooFinance(
  ticker: string,
): Promise<FinancialMetrics> {
  const url = `${YF_BASE}/${encodeURIComponent(ticker)}?modules=${YF_MODULES}&lang=en-US&region=US`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; research-bot/1.0)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance returned ${res.status} for ${ticker}`);
  }

  const json = (await res.json()) as {
    quoteSummary?: {
      result?: unknown[];
    };
  };
  const result = json?.quoteSummary?.result?.[0];
  if (!result) throw new Error(`No data found for ticker: ${ticker}`);

  const d = result as YFRaw;
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
