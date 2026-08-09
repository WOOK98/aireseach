// ─── Industry Research Brief v1 — Shared Types ──────────────────────────────
// Adapted from Guan-Yep/industry-research (MIT License)
// Original: https://github.com/Guan-Yep/industry-research
// License: https://github.com/Guan-Yep/industry-research/blob/main/LICENSE
//
// These types define the structured output for Industry Research Brief.

/** A node in the industry value chain */
export interface ValueChainNode {
  layer: string; // e.g. "End Demand", "Midstream", "Upstream Raw Materials"
  description: string;
  keyPlayers: {
    ticker: string;
    name: string;
    exchange: string;
    role: string; // short role description
  }[];
  bottleneckStrength: "strong" | "moderate" | "weak" | "none";
}

/** TAM / SAM / SOM market sizing */
export interface MarketSizing {
  tam: MarketEstimate;
  sam: MarketEstimate;
  som: MarketEstimate;
  crossValidationNote?: string; // explain if gap > 20%
}

export interface MarketEstimate {
  label: string; // e.g. "Total Addressable Market"
  value: string; // e.g. "$12.5B (2025E)"
  methodology: "top-down" | "bottom-up" | "both";
  source: string;
  confidence: "verified" | "partial" | "unverified";
}

/** Market size time series */
export interface MarketSizePoint {
  year: string;
  size: string;
  growthRate?: string;
  source: string;
}

/** Competitive concentration metrics */
export interface CompetitionMetrics {
  cr3: string | null; // e.g. "62%"
  cr5: string | null;
  hhi: string | null; // e.g. "2,450"
  trend: "consolidating" | "fragmenting" | "stable" | "unknown";
  shareAttribution?: {
    brand: string;
    channel: string;
    price: string;
    innovation: string;
  };
}

/** A competitive share data point */
export interface ShareEntry {
  player: string;
  ticker?: string;
  share: string;
  change?: string; // YoY change
  source: string;
}

/** A source entry with 7-tier priority classification */
export interface SourceEntry {
  name: string;
  tier: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  tierLabel: string;
  url?: string;
  claim: string; // what this source supports
  date?: string;
  confidence: "verified" | "partial" | "unverified";
}

/** Chart/table specification for the brief */
export interface ChartSpec {
  type:
    | "market-size-table"
    | "share-table"
    | "value-chain"
    | "bar-chart"
    | "pie-chart";
  title: string; // assertive caption (insight, not description)
  data: unknown;
}

/** The complete Industry Research Brief */
export interface IndustryBrief {
  /** Why this matters now + boundary definition */
  definition: string;
  /** Value chain from end-demand to upstream */
  valueChain: ValueChainNode[];
  /** TAM/SAM/SOM with cross-validation */
  marketSizing: MarketSizing;
  /** Historical market size data */
  marketSizeHistory: MarketSizePoint[];
  /** CR3/CR5/HHI + share attribution */
  competition: CompetitionMetrics;
  /** Competitive share breakdown */
  shareBreakdown: ShareEntry[];
  /** Sources with 7-tier classification */
  sources: SourceEntry[];
  /** Data gaps and assumptions */
  limitations: string[];
  /** Follow-up candidates for deep dive */
  followUpCandidates: {
    ticker: string;
    name: string;
    exchange: string;
    reason: string;
  }[];
}

/**
 * 7-tier source priority (from industry-research skill)
 * Tier 1: Official government, regulator, statistical bureau, exchange, court, customs, patent, standards bodies
 * Tier 2: Company filings, annual reports, prospectuses, investor presentations, earnings calls
 * Tier 3: Industry associations and standards organizations
 * Tier 4: Reputable research firms, consultancies, and investment banks
 * Tier 5: Credible trade media and databases
 * Tier 6: Company websites, product documentation, and interviews
 * Tier 7: Secondary media summaries
 */
export const SOURCE_TIERS = {
  1: "Official government / regulator / statistical bureau / exchange",
  2: "Company filings / annual reports / prospectuses / earnings calls",
  3: "Industry associations / standards organizations",
  4: "Research firms / consultancies / investment banks",
  5: "Credible trade media / databases",
  6: "Company websites / product documentation / interviews",
  7: "Secondary media summaries",
} as const;

// Re-export schema and parser
export { IndustryBriefSchema, parseIndustryBrief } from "./schema";
export type { IndustryBriefValidated } from "./schema";

// Re-export contract (single source of truth for prompt methodology)
export {
  INDUSTRY_BRIEF_METHODOLOGY,
  INDUSTRY_BRIEF_OUTPUT_STRUCTURE,
  INDUSTRY_BRIEF_JSON_INSTRUCTIONS,
} from "./contract";
