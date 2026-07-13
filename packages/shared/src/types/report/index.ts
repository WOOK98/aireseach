export interface FinancialMetrics {
  // Identity
  ticker: string;
  companyName: string;
  exchange: string;
  sector: string;
  industry: string;
  description: string;

  // Price
  currentPrice: number;
  marketCap: number;
  currency: string;
  priceChange: number | null; // absolute change
  priceChangePercent: number | null; // % change
  marketState: string; // "REGULAR" | "PRE" | "POST" | "CLOSED"

  // Income Statement
  revenue: number;
  revenueGrowthYoy: number; // %
  grossProfit: number;
  grossMargin: number; // %
  operatingIncome: number;
  operatingMargin: number; // %
  netIncome: number;
  netMargin: number; // %
  ebitda: number;
  eps: number;
  epsGrowthYoy: number; // %

  // Balance Sheet
  totalCash: number;
  totalDebt: number;
  netCash: number;

  // Valuation
  peRatio: number | null;
  pbRatio: number | null;
  psRatio: number | null;
  evEbitda: number | null;
  forwardPE: number | null;

  // Cash Flow
  freeCashFlow: number;
  fcfMargin: number; // %

  // Historical — for charts (last 8 quarters)
  revenueHistory: QuarterlyPoint[];
  grossMarginHistory: QuarterlyPoint[];
  operatingMarginHistory: QuarterlyPoint[];
  fcfHistory: QuarterlyPoint[];
}

export interface QuarterlyPoint {
  period: string; // e.g. "Q1 2024"
  value: number;
}

export interface ReportSection {
  label: string;
  content: string;
}

export interface ReportData {
  ticker: string;
  companyName: string;
  rating: "Buy" | "Hold" | "Sell";
  ratingRationale: string;
  targetPrice: number;
  upside: number; // %
  investmentThesis: string;
  sections: {
    overview: string;
    growthDrivers: string;
    profitability: string;
    risks: string[];
    valuation: string;
    catalysts: string;
  };
  decisionBrief?: {
    action: string;
    confidence: "Low" | "Medium" | "High";
    timeHorizon: string;
    keyQuestion: string;
  };
  scenarioMatrix?: Array<{
    scenario: string;
    probability: number;
    targetPrice: number;
    drivers: string[];
  }>;
  roleBriefs?: Array<{
    role: string;
    takeaway: string;
    concern: string;
  }>;
  watchlist?: Array<{
    metric: string;
    current: string;
    threshold: string;
    whyItMatters: string;
  }>;
  nextSteps?: string[];
  evidenceNeeds?: string[];
  generatedAt: string;
}
