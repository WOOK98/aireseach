/**
 * L2 TQS — Thesis Quality Score: Pure Functions
 *
 * Evaluates the quality of a report's thesis, NOT the quality of the stock.
 * A high-TQS bearish thesis is equally valuable as a high-TQS bullish thesis.
 *
 * Five factors (each 0–100 or null if unscorable):
 *   F1: Grounding (25%)        — L1 landingRate, direct passthrough
 *   F2: Invalidation Obs (25%) — Are wrongIf conditions machine-monitorable?
 *   F3: Freshness (20%)        — How fresh is the cited data?
 *   F4: Source Tier (15%)      — Primary vs secondary sources
 *   F5: Counter Coverage (15%) — Substantive bear case + quantified risks
 *
 * See: docs/product/L2-TQS-THESIS-QUALITY-SCORE.md
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface TQSFactorScore {
  score: number | null; // 0–100, null = cannot evaluate
  reason: string; // human-readable one-sentence explanation
}

export interface TQSFactors {
  F1_grounding: TQSFactorScore;
  F2_invalidation: TQSFactorScore;
  F3_freshness: TQSFactorScore;
  F4_source: TQSFactorScore;
  F5_counter: TQSFactorScore;
}

export type TQSTier = "S" | "A" | "B" | "C" | "D" | "F";

export interface TQSResult {
  score: number; // 0–100 weighted total
  tier: TQSTier;
  factors: TQSFactors;
  hardFloorApplied: string | null; // reason if a hard floor was triggered
  disclaimer: string;
}

export interface TQSInput {
  landingRate: number; // 0–1, from L1
  topJudgments: Array<{
    judgment: string;
    keyNumber: string;
    wrongIf: string;
    dataPoint?: string;
    metric?: string;
    trigger?: string;
    freq?: string;
    source?: string;
  }>;
  thesisBreakers: Array<{ condition: string }>;
  risks: string[];
  bearCase?: string[];
  reportDate: string; // ISO date YYYY-MM-DD
  monitorPanel?: {
    monitors: Array<{
      metric: string;
      current: string;
      trigger: string;
    }>;
  };
}

// ── Constants ───────────────────────────────────────────────────────────────

const TQS_DISCLAIMER =
  "Thesis Quality Score evaluates evidence completeness and logical closure. " +
  "A high-TQS bearish thesis is equally valuable as a high-TQS bullish thesis. " +
  "TQS is not a buy/sell/hold recommendation.";

const FACTOR_WEIGHTS = {
  F1_grounding: 0.25,
  F2_invalidation: 0.25,
  F3_freshness: 0.2,
  F4_source: 0.15,
  F5_counter: 0.15,
} as const;

// Source tier classification
const SOURCE_TIERS: Array<{ pattern: RegExp; tier: number; weight: number }> = [
  // S1: Primary filings
  {
    pattern:
      /\b(10-K|10-Q|20-F|6-K|filing|SEC|EDGAR|annual report|quarterly report|earnings release|10K|10Q)\b/i,
    tier: 1,
    weight: 1.0,
  },
  // S2: Company official
  {
    pattern:
      /\b(IR|investor relations|press release|investor day|company (report|filing|statement)|prospectus|proxy)\b/i,
    tier: 2,
    weight: 0.8,
  },
  // S3: Sell-side research
  {
    pattern:
      /\b(Morgan Stanley|Goldman Sachs|JP ?Morgan|Barclays|UBS|Credit Suisse|Deutsche Bank|Citigroup|analyst|broker|sell.?side)\b/i,
    tier: 3,
    weight: 0.6,
  },
  // S4: Financial media
  {
    pattern:
      /\b(Bloomberg|Reuters|WSJ|Financial Times|CNBC|MarketWatch|Yahoo Finance|Nikkei|media)\b/i,
    tier: 4,
    weight: 0.4,
  },
  // S5: Social/community
  {
    pattern:
      /\b(Twitter|X\.com|Reddit|StockTwits|雪球|social|forum|community)\b/i,
    tier: 5,
    weight: 0.2,
  },
];

// Date parsing patterns
const DATE_PATTERNS = [
  // ISO: 2026-07-15
  {
    regex: /(\d{4})-(\d{2})-(\d{2})/,
    parse: (m: RegExpMatchArray) =>
      new Date(+(m[1] ?? 0), +(m[2] ?? 1) - 1, +(m[3] ?? 1)),
  },
  // FY2025 / FY26
  {
    regex: /FY\s*(\d{4})/i,
    parse: (m: RegExpMatchArray) => new Date(+(m[1] ?? 0), 11, 31),
  },
  // Q1-Q4 2026 / Q1-Q4 FY2026
  {
    regex: /Q([1-4])\s*(?:FY)?\s*(\d{4})/i,
    parse: (m: RegExpMatchArray) => {
      const q = +(m[1] ?? 1);
      const year = +(m[2] ?? 0);
      // Quarter end months: Q1=Mar, Q2=Jun, Q3=Sep, Q4=Dec
      const month = ([2, 5, 8, 11] as const)[q - 1] ?? 2;
      return new Date(year, month, 28);
    },
  },
  // 2026 (standalone year)
  {
    regex: /^(20\d{2})$/,
    parse: (m: RegExpMatchArray) => new Date(+(m[1] ?? 0), 5, 30),
  },
];

// ── Factor scorers ──────────────────────────────────────────────────────────

/**
 * F1: Grounding — direct passthrough of L1 landingRate.
 */
function scoreGrounding(landingRate: number): TQSFactorScore {
  if (landingRate < 0 || landingRate > 1 || isNaN(landingRate)) {
    return { score: null, reason: "Landing rate unavailable or out of range." };
  }
  const score = Math.round(landingRate * 100);
  const pct = (landingRate * 100).toFixed(0);
  return {
    score,
    reason: `${pct}% of assertions have data-point bindings.`,
  };
}

/**
 * F2: Invalidation Observability — are wrongIf conditions machine-monitorable?
 *
 * Scoring dimensions (each 0-20, averaged):
 *   1. Has numeric threshold
 *   2. Has verifiable metric + trigger
 *   3. Has timeframe
 *   4. Causal chain present (keyNumber → judgment → wrongIf)
 *   5. Actionable (numeric + verifiable source)
 */
function scoreInvalidationObservability(
  judgments: TQSInput["topJudgments"],
): TQSFactorScore {
  if (judgments.length === 0) {
    return {
      score: null,
      reason: "No top judgments to evaluate.",
    };
  }

  const scores = judgments.map((j) => {
    const wrongIf = j.wrongIf?.trim() ?? "";
    if (!wrongIf) return 0;

    // Dimension 1: Has numeric threshold?
    const hasNumeric = /\d/.test(wrongIf) ? 20 : 0;

    // Dimension 2: Has verifiable metric + trigger?
    const hasVerifiableSource =
      j.metric && j.trigger ? 20 : j.metric || j.trigger ? 10 : 0;

    // Dimension 3: Has timeframe?
    const hasTimeframe =
      /\b(Q[1-4]|FY\d{4}|20\d{2}|quarters?|months?|years?|weeks?|daily)\b/i.test(
        wrongIf,
      )
        ? 20
        : /\b(short|medium|long)\s*(term|run)\b/i.test(wrongIf)
          ? 10
          : 5;

    // Dimension 4: Causal chain — keyNumber referenced or related to wrongIf
    // v1 heuristic: if keyNumber has a number and wrongIf has a number, assume chain exists
    const keyHasNum = /\d/.test(j.keyNumber ?? "");
    const wrongHasNum = /\d/.test(wrongIf);
    const causalChain = keyHasNum && wrongHasNum ? 15 : keyHasNum ? 10 : 5;

    // Dimension 5: Actionable
    const isActionable =
      hasNumeric > 0 && hasVerifiableSource > 10 ? 20 : hasNumeric > 0 ? 10 : 5;

    return (
      (hasNumeric +
        hasVerifiableSource +
        hasTimeframe +
        causalChain +
        isActionable) /
      5
    );
  });

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const score = Math.round(avg);

  const withNumeric = judgments.filter((j) =>
    /\d/.test(j.wrongIf ?? ""),
  ).length;
  const withMetric = judgments.filter((j) => !!j.metric).length;

  return {
    score,
    reason: `${withNumeric}/${judgments.length} wrongIf conditions have numeric thresholds; ${withMetric}/${judgments.length} have linked metrics.`,
  };
}

/**
 * F3: Data Freshness — how fresh are cited data points?
 *
 * Scoring:
 *   ≤ 30 days: 100
 *   31–90 days: 80
 *   91–180 days: 60
 *   181–365 days: 40
 *   > 365 days: 20
 *   Unparseable: 50 (neutral)
 */
function scoreDataFreshness(
  judgments: TQSInput["topJudgments"],
  reportDate: string,
): TQSFactorScore {
  const reportTime = new Date(reportDate).getTime();
  if (isNaN(reportTime)) {
    return {
      score: null,
      reason: "Report date unparseable; freshness cannot be evaluated.",
    };
  }

  if (judgments.length === 0) {
    return {
      score: null,
      reason: "No data points to evaluate freshness.",
    };
  }

  const dayScores: number[] = [];

  for (const j of judgments) {
    const dp = j.dataPoint?.trim();
    if (!dp) {
      dayScores.push(50); // neutral for missing dataPoint
      continue;
    }

    const parsedDate = parseDateFromText(dp);
    if (!parsedDate) {
      dayScores.push(50); // neutral for unparseable
      continue;
    }

    const daysDiff = Math.abs(
      (reportTime - parsedDate.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (daysDiff <= 30) dayScores.push(100);
    else if (daysDiff <= 90) dayScores.push(80);
    else if (daysDiff <= 180) dayScores.push(60);
    else if (daysDiff <= 365) dayScores.push(40);
    else dayScores.push(20);
  }

  const avg = dayScores.reduce((a, b) => a + b, 0) / dayScores.length;
  const score = Math.round(avg);

  const fresh = dayScores.filter((s) => s >= 80).length;
  const stale = dayScores.filter((s) => s <= 40).length;

  return {
    score,
    reason: `${fresh}/${judgments.length} data points are ≤90 days old; ${stale}/${judgments.length} are >6 months old.`,
  };
}

/**
 * F4: Source Tier — primary vs secondary source classification.
 *
 * Scoring: weighted average of source tier weights × 100.
 *   S1 (filing): 100, S2 (company): 80, S3 (sell-side): 60,
 *   S4 (media): 40, S5 (social): 20, unknown: 30
 */
function scoreSourceTier(judgments: TQSInput["topJudgments"]): TQSFactorScore {
  if (judgments.length === 0) {
    return {
      score: null,
      reason: "No data points to evaluate source quality.",
    };
  }

  const weights: number[] = [];

  for (const j of judgments) {
    const dp = j.dataPoint?.trim() ?? "";
    const source = j.source?.trim() ?? "";
    const combined = `${dp} ${source}`;

    let matched = false;
    for (const st of SOURCE_TIERS) {
      if (st.pattern.test(combined)) {
        weights.push(st.weight);
        matched = true;
        break;
      }
    }
    if (!matched) {
      weights.push(0.3); // unknown source default
    }
  }

  const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
  const score = Math.round(avg * 100);

  const primary = weights.filter((w) => w >= 0.8).length;
  const secondary = weights.filter((w) => w < 0.5).length;

  return {
    score,
    reason: `${primary}/${judgments.length} from primary sources (filings/official); ${secondary}/${judgments.length} from secondary/social.`,
  };
}

/**
 * F5: Counter Coverage — substantive bear case + quantified risks.
 *
 * Scoring dimensions (each 0-25, summed to 0-100):
 *   1. Risk count (0-25): 3+ substantive = 25, 1-2 = 15, 0 = 0
 *   2. Quantified risks (0-25): most risks have numbers = 25, some = 15, none = 0
 *   3. wrongIf symmetry (0-25): all judgments have wrongIf = 25, partial = 15, none = 0
 *   4. Bear case quality (0-25): substantive = 25, thin = 10, absent = 0
 */
function scoreCounterCoverage(
  input: Pick<
    TQSInput,
    "risks" | "thesisBreakers" | "bearCase" | "topJudgments"
  >,
): TQSFactorScore {
  const { risks, thesisBreakers, bearCase, topJudgments } = input;

  // Dimension 1: Risk count
  // Filter out generic/boilerplate risks
  const substantiveRisks = risks.filter((r) => {
    const lower = r.toLowerCase().trim();
    return (
      lower.length > 20 &&
      !/^risks?\s*(include|are|may|could|might)/i.test(lower) &&
      !/disclaimer/i.test(lower)
    );
  });
  let riskCountScore: number;
  if (substantiveRisks.length >= 3) riskCountScore = 25;
  else if (substantiveRisks.length >= 1) riskCountScore = 15;
  else riskCountScore = 0;

  // Dimension 2: Quantified risks
  const quantifiedRisks = substantiveRisks.filter((r) => /\d/.test(r));
  let quantifiedScore: number;
  if (substantiveRisks.length > 0) {
    const ratio = quantifiedRisks.length / substantiveRisks.length;
    if (ratio >= 0.6) quantifiedScore = 25;
    else if (ratio >= 0.3) quantifiedScore = 15;
    else quantifiedScore = 5;
  } else {
    quantifiedScore = 0;
  }

  // Dimension 3: wrongIf symmetry
  const withWrongIf = topJudgments.filter((j) => {
    const w = j.wrongIf?.trim() ?? "";
    return w.length > 0 && w.toLowerCase() !== "n/a";
  });
  let symmetryScore: number;
  if (topJudgments.length > 0) {
    const ratio = withWrongIf.length / topJudgments.length;
    if (ratio >= 1) symmetryScore = 25;
    else if (ratio >= 0.5) symmetryScore = 15;
    else symmetryScore = 5;
  } else {
    symmetryScore = 0;
  }

  // Dimension 4: Bear case quality
  let bearScore: number;
  if (bearCase && bearCase.length > 0) {
    const substantive = bearCase.filter((b) => b.length > 30 && /\d/.test(b));
    if (substantive.length >= 2) bearScore = 25;
    else if (substantive.length >= 1) bearScore = 15;
    else bearScore = 10;
  } else {
    // No bear case — snapshot mode gives full credit for thesis breakers
    bearScore = thesisBreakers.length > 0 ? 20 : 0;
  }

  const total = riskCountScore + quantifiedScore + symmetryScore + bearScore;
  const score = Math.round(total);

  return {
    score,
    reason: `${substantiveRisks.length} substantive risks (${quantifiedRisks.length} quantified); ${withWrongIf.length}/${topJudgments.length} judgments have invalidation conditions; bear case ${bearCase && bearCase.length > 0 ? "present" : "absent"}.`,
  };
}

// ── Aggregation ─────────────────────────────────────────────────────────────

/**
 * Compute weighted TQS score from factor scores.
 * Null factors are excluded from the weighted average (their weight is
 * redistributed proportionally to the remaining factors).
 */
function aggregateFactors(factors: TQSFactors): {
  score: number;
  nullCount: number;
} {
  const entries = Object.entries(factors) as Array<
    [keyof TQSFactors, TQSFactorScore]
  >;
  let totalWeight = 0;
  let weightedSum = 0;
  let nullCount = 0;

  for (const [key, factor] of entries) {
    const weight = FACTOR_WEIGHTS[key];
    if (factor.score === null) {
      nullCount++;
      continue;
    }
    totalWeight += weight;
    weightedSum += factor.score * weight;
  }

  if (totalWeight === 0) return { score: 0, nullCount };
  return { score: Math.round(weightedSum / totalWeight), nullCount };
}

/**
 * Map TQS score to tier.
 */
function scoreToTier(score: number): TQSTier {
  if (score >= 90) return "S";
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  if (score >= 45) return "C";
  if (score >= 30) return "D";
  return "F";
}

/**
 * Hard floor conditions — cap the maximum tier.
 */
function applyHardFloors(
  tier: TQSTier,
  input: TQSInput,
  factors: TQSFactors,
): { tier: TQSTier; reason: string | null } {
  const floors: Array<{ condition: boolean; cap: TQSTier; reason: string }> = [
    {
      condition: input.landingRate < 0.5,
      cap: "C",
      reason: "L1 landing rate below 50% — maximum tier capped at C.",
    },
    {
      condition:
        factors.F4_source.score !== null &&
        !input.topJudgments.some((j) =>
          /\b(10-K|10-Q|20-F|6-K|filing|SEC|EDGAR)\b/i.test(
            `${j.dataPoint ?? ""} ${j.source ?? ""}`,
          ),
        ),
      cap: "B",
      reason: "No primary filing sources — maximum tier capped at B.",
    },
    {
      condition:
        input.topJudgments.length > 0 &&
        input.topJudgments.filter((j) => /\d/.test(j.wrongIf ?? "")).length ===
          0,
      cap: "D",
      reason: "Zero judgments with numeric wrongIf — maximum tier capped at D.",
    },
  ];

  const tierOrder: TQSTier[] = ["S", "A", "B", "C", "D", "F"];

  // Find the strictest applicable floor (lowest tier = highest index)
  let cappedTier = tier;
  let appliedReason: string | null = null;

  for (const floor of floors) {
    if (!floor.condition) continue;
    const capIdx = tierOrder.indexOf(floor.cap);
    // If the cap is a lower tier than current, apply it
    if (capIdx > tierOrder.indexOf(cappedTier)) {
      cappedTier = floor.cap;
      appliedReason = floor.reason;
    }
  }

  return { tier: cappedTier, reason: appliedReason };
}

// ── Main function ───────────────────────────────────────────────────────────

/**
 * Compute TQS (Thesis Quality Score).
 * Pure function — no side effects, no external calls.
 *
 * Redline: TQS evaluates thesis quality, NOT stock quality.
 * A high-TQS bearish thesis is equally valuable as a high-TQS bullish thesis.
 */
export function computeTQS(input: TQSInput): TQSResult {
  const factors: TQSFactors = {
    F1_grounding: scoreGrounding(input.landingRate),
    F2_invalidation: scoreInvalidationObservability(input.topJudgments),
    F3_freshness: scoreDataFreshness(input.topJudgments, input.reportDate),
    F4_source: scoreSourceTier(input.topJudgments),
    F5_counter: scoreCounterCoverage(input),
  };

  const { score, nullCount } = aggregateFactors(factors);

  let tier = scoreToTier(score);
  const { tier: finalTier, reason: hardFloorReason } = applyHardFloors(
    tier,
    input,
    factors,
  );

  if (nullCount > 0 && hardFloorReason === null) {
    // Note when factors were unscorable
    return {
      score,
      tier: finalTier,
      factors,
      hardFloorApplied: null,
      disclaimer: TQS_DISCLAIMER,
    };
  }

  return {
    score,
    tier: finalTier,
    factors,
    hardFloorApplied: hardFloorReason,
    disclaimer: TQS_DISCLAIMER,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse a date from a dataPoint string.
 * Tries multiple patterns: ISO, FY, Q1-Q4, standalone year.
 */
function parseDateFromText(text: string): Date | null {
  for (const { regex, parse } of DATE_PATTERNS) {
    const match = text.match(regex);
    if (match) {
      const d = parse(match);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}
