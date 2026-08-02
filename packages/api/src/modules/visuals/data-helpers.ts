/**
 * Data Visualization Atlas — Pure Data Helpers
 *
 * All functions are pure: they take DB rows as input and return
 * structured panel data. No side effects, no DB calls, no vendor names.
 *
 * #57 null semantics: null = missing data, 0 = real zero.
 * These helpers never coerce null → 0.
 */

import type {
  SelectLedgerJudgment,
  SelectLedgerVerification,
} from "@workspace/db/schema";

// ── Types ────────────────────────────────────────────────────────────────────

export type VerificationState =
  | "confirmed"
  | "invalidated"
  | "needs_manual_review"
  | "insufficient_data";

export interface WatchlistVerificationFlow {
  /** L3 verification 4-state stats */
  states: Record<VerificationState, number>;
  /** Period label, e.g. "Last 30 days" */
  period: string;
  /** Total judgments in the period */
  total: number;
}

export interface TQSDistribution {
  /** Tier → count */
  tiers: Record<string, number>;
  /** Total scored judgments */
  total: number;
  /** Disclaimer */
  disclaimer: string;
}

export interface CompanyFundamentalsTimeline {
  ticker: string;
  companyName: string;
  revenueHistory: Array<{ period: string; value: number | null }>;
  grossMarginHistory: Array<{ period: string; value: number | null }>;
  operatingMarginHistory: Array<{ period: string; value: number | null }>;
  fcfHistory: Array<{ period: string; value: number | null }>;
}

export interface EvidenceSourceMix {
  /** Source tier → count */
  tiers: Record<string, number>;
  /** Total judgments with source info */
  total: number;
}

export interface PanelManifest {
  id: string;
  title: string;
  description: string;
  dataEndpoint: string;
  fields: Record<string, string>;
  lastRefreshed: string | null;
  sourcePaths: string[];
}

export interface VisualsManifest {
  panels: PanelManifest[];
  lastRefreshed: string | null;
}

// ── Source tier classification ────────────────────────────────────────────────

const SOURCE_TIER_PATTERNS: Array<{ tier: string; pattern: RegExp }> = [
  {
    tier: "filing",
    pattern:
      /\b(10-K|10-Q|20-F|6-K|filing|SEC|EDGAR|annual report|quarterly report|earnings release)\b/i,
  },
  {
    tier: "company",
    pattern:
      /\b(IR|investor relations|press release|investor day|company report|prospectus|proxy)\b/i,
  },
  {
    tier: "media",
    pattern:
      /\b(Bloomberg|Reuters|WSJ|Financial Times|CNBC|MarketWatch|Yahoo|Nikkei|media|analyst|broker)\b/i,
  },
  {
    tier: "social",
    pattern:
      /\b(Twitter|X\.com|Reddit|StockTwits|雪球|social|forum|community)\b/i,
  },
];

function classifySourceTier(source: string | null | undefined): string {
  if (!source) return "unknown";
  for (const { tier, pattern } of SOURCE_TIER_PATTERNS) {
    if (pattern.test(source)) return tier;
  }
  return "unknown";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ALL_VERIFICATION_STATES = new Set<VerificationState>([
  "confirmed",
  "invalidated",
  "needs_manual_review",
  "insufficient_data",
]);

const ALL_TQS_TIERS = ["S", "A", "B", "C", "D", "F"];

// ── Panel 1: Watchlist Verification Flow ─────────────────────────────────────

/**
 * Compute L3 verification 4-state stats for a given period.
 *
 * @param verifications - Verification rows (already filtered by user)
 * @param periodDays - 30 or 90
 * @param now - Current date (injectable for testing)
 */
export function computeVerificationFlow(
  verifications: Array<Pick<SelectLedgerVerification, "result" | "verifiedAt">>,
  periodDays: 30 | 90,
  now: Date = new Date(),
): WatchlistVerificationFlow {
  const cutoff = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const states: Record<VerificationState, number> = {
    confirmed: 0,
    invalidated: 0,
    needs_manual_review: 0,
    insufficient_data: 0,
  };

  let total = 0;

  for (const v of verifications) {
    const verifiedAt = new Date(v.verifiedAt);
    if (verifiedAt < cutoff) continue;
    // Exclude "pending" — a pending verification hasn't actually evaluated anything
    if (v.result === "pending") continue;

    const result = v.result as VerificationState;
    if (ALL_VERIFICATION_STATES.has(result)) {
      states[result]++;
      total++;
    }
  }

  return {
    states,
    period: `Last ${periodDays} days`,
    total,
  };
}

// ── Panel 2: TQS Distribution ────────────────────────────────────────────────

/**
 * Compute TQS tier distribution from judgment records.
 *
 * @param judgments - Judgment rows with tqsTier populated
 */
export function computeTQSDistribution(
  judgments: Array<Pick<SelectLedgerJudgment, "tqsTier">>,
): TQSDistribution {
  const tiers: Record<string, number> = {};
  for (const tier of ALL_TQS_TIERS) {
    tiers[tier] = 0;
  }

  let total = 0;

  for (const j of judgments) {
    if (j.tqsTier && ALL_TQS_TIERS.includes(j.tqsTier)) {
      tiers[j.tqsTier] = (tiers[j.tqsTier] ?? 0) + 1;
      total++;
    }
  }

  return {
    tiers,
    total,
    disclaimer:
      "Thesis Quality Score evaluates evidence completeness and logical closure. " +
      "A high-TQS bearish thesis is equally valuable as a high-TQS bullish thesis. " +
      "TQS is not a buy/sell/hold recommendation.",
  };
}

// ── Panel 3: Company Fundamentals Timeline ────────────────────────────────────

/**
 * Null-safe check: at least one non-null value in a history array.
 * #57: null = missing, 0 = real zero. An all-null series is empty.
 */
export function hasNonNullValues(
  history: Array<{ value: number | null }>,
): boolean {
  return history.some((p) => p.value != null);
}

// ── Panel 4: Evidence Source Mix ──────────────────────────────────────────────

/**
 * Classify source tiers from judgment records.
 *
 * @param judgments - Judgment rows with source field
 */
export function computeEvidenceSourceMix(
  judgments: Array<Pick<SelectLedgerJudgment, "source">>,
): EvidenceSourceMix {
  const tiers: Record<string, number> = {
    filing: 0,
    company: 0,
    media: 0,
    social: 0,
    unknown: 0,
  };

  let total = 0;

  for (const j of judgments) {
    const tier = classifySourceTier(j.source);
    tiers[tier] = (tiers[tier] ?? 0) + 1;
    total++;
  }

  return { tiers, total };
}

// ── Manifest ─────────────────────────────────────────────────────────────────

/**
 * Build the manifest for the /api/visuals/manifest endpoint.
 * Does not expose vendor names, env vars, or internal paths.
 */
export function buildManifest(lastRefreshed: Date | null): VisualsManifest {
  const refreshed = lastRefreshed?.toISOString() ?? null;

  return {
    panels: [
      {
        id: "watchlist-verification-flow",
        title: "Watchlist Verification Flow",
        description:
          "L3 verification 4-state distribution for the last 30 and 90 days.",
        dataEndpoint: "/api/visuals/verification-flow",
        fields: {
          confirmed: "number",
          invalidated: "number",
          needs_manual_review: "number",
          insufficient_data: "number",
          period: "string",
          total: "number",
        },
        lastRefreshed: refreshed,
        sourcePaths: ["ledger_verification", "ledger_judgment"],
      },
      {
        id: "tqs-distribution",
        title: "TQS Distribution",
        description:
          "Thesis Quality Score tier distribution. TQS measures thesis quality, not stock quality.",
        dataEndpoint: "/api/visuals/tqs-distribution",
        fields: {
          S: "number",
          A: "number",
          B: "number",
          C: "number",
          D: "number",
          F: "number",
          total: "number",
        },
        lastRefreshed: refreshed,
        sourcePaths: ["ledger_judgment"],
      },
      {
        id: "company-fundamentals-timeline",
        title: "Company Fundamentals Timeline",
        description:
          "Revenue, gross margin, operating margin, and FCF quarterly history.",
        dataEndpoint: "/api/visuals/fundamentals?ticker={symbol}",
        fields: {
          revenueHistory: "QuarterlyPoint[]",
          grossMarginHistory: "QuarterlyPoint[]",
          operatingMarginHistory: "QuarterlyPoint[]",
          fcfHistory: "QuarterlyPoint[]",
        },
        lastRefreshed: refreshed,
        sourcePaths: ["financial_data"],
      },
      {
        id: "evidence-source-mix",
        title: "Evidence Source Mix",
        description:
          "Source tier breakdown: filing, company, media, social, unknown.",
        dataEndpoint: "/api/visuals/source-mix",
        fields: {
          filing: "number",
          company: "number",
          media: "number",
          social: "number",
          unknown: "number",
          total: "number",
        },
        lastRefreshed: refreshed,
        sourcePaths: ["ledger_judgment"],
      },
    ],
    lastRefreshed: refreshed,
  };
}
