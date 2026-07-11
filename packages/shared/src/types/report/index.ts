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
  thesisQuality: {
    tier: "S" | "A" | "B" | "C" | "D" | "F";
    rationale: string;
    disclaimer: string;
  };
  topJudgments?: Array<{
    judgment: string;
    keyNumber: string;
    wrongIf: string;
  }>;
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
    keyMetric: string;
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
  monitorPanel?: {
    schema_version: 1;
    monitors: Array<{
      metric: string;
      current: string;
      trigger: string;
      tolerance?: string;
      freq: "Daily" | "Weekly" | "Quarterly" | "Event-driven";
      source: string;
    }>;
  };
  nextSteps?: string[];
  evidenceNeeds?: string[];
  generatedAt: string;
}
