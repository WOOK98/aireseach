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
  reason: string;
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
  score: number; // 0–100 (capped at 44 when unreliable)
  tier: TQSTier;
  factors: TQSFactors;
  hardFloorApplied: string | null;
  unreliable: boolean; // true when ≥3 factors are null
  disclaimer: string;
}

export interface TQSInput {
  landingRate: number;
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
  reportDate: string; // YYYY-MM-DD
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

const SOURCE_TIERS: Array<{ pattern: RegExp; weight: number }> = [
  {
    pattern:
      /\b(10-K|10-Q|20-F|6-K|filing|SEC|EDGAR|annual report|quarterly report|earnings release|10K|10Q)\b/i,
    weight: 1.0,
  },
  {
    pattern:
      /\b(IR|investor relations|press release|investor day|company (report|filing|statement)|prospectus|proxy)\b/i,
    weight: 0.8,
  },
  {
    pattern:
      /\b(Morgan Stanley|Goldman Sachs|JP ?Morgan|Barclays|UBS|Credit Suisse|Deutsche Bank|Citigroup|analyst|broker|sell.?side)\b/i,
    weight: 0.6,
  },
  {
    pattern:
      /\b(Bloomberg|Reuters|WSJ|Financial Times|CNBC|MarketWatch|Yahoo|Nikkei|media)\b/i,
    weight: 0.4,
  },
  {
    pattern:
      /\b(Twitter|X\.com|Reddit|StockTwits|雪球|social|forum|community)\b/i,
    weight: 0.2,
  },
];

const DATE_PATTERNS = [
  {
    regex: /(\d{4})-(\d{2})-(\d{2})/,
    parse: (m: RegExpMatchArray) =>
      new Date(+(m[1] ?? 0), +(m[2] ?? 1) - 1, +(m[3] ?? 1)),
  },
  {
    regex: /FY\s*(\d{4})/i,
    parse: (m: RegExpMatchArray) => new Date(+(m[1] ?? 0), 11, 31),
  },
  {
    regex: /Q([1-4])\s*(?:FY)?\s*(\d{4})/i,
    parse: (m: RegExpMatchArray) => {
      const q = +(m[1] ?? 1);
      const year = +(m[2] ?? 0);
      const month = ([2, 5, 8, 11] as const)[q - 1] ?? 2;
      return new Date(year, month, 28);
    },
  },
  {
    regex: /^(20\d{2})$/,
    parse: (m: RegExpMatchArray) => new Date(+(m[1] ?? 0), 5, 30),
  },
];

// ── Factor scorers ──────────────────────────────────────────────────────────

function scoreGrounding(landingRate: number): TQSFactorScore {
  if (landingRate < 0 || landingRate > 1 || isNaN(landingRate)) {
    return { score: null, reason: "Landing rate unavailable or out of range." };
  }
  return {
    score: Math.round(landingRate * 100),
    reason: `${(landingRate * 100).toFixed(0)}% of assertions have data-point bindings.`,
  };
}

function scoreInvalidationObservability(
  judgments: TQSInput["topJudgments"],
): TQSFactorScore {
  if (judgments.length === 0) {
    return { score: null, reason: "No top judgments to evaluate." };
  }

  const scores = judgments.map((j) => {
    const wrongIf = j.wrongIf?.trim() ?? "";
    if (!wrongIf) return 0;
    const hasNumeric = /\d/.test(wrongIf) ? 20 : 0;
    const hasVerifiableSource =
      j.metric && j.trigger ? 20 : j.metric || j.trigger ? 10 : 0;
    const hasTimeframe =
      /\b(Q[1-4]|FY\d{4}|20\d{2}|quarters?|months?|years?|weeks?|daily)\b/i.test(
        wrongIf,
      )
        ? 20
        : /\b(short|medium|long)\s*(term|run)\b/i.test(wrongIf)
          ? 10
          : 5;
    const keyHasNum = /\d/.test(j.keyNumber ?? "");
    const wrongHasNum = /\d/.test(wrongIf);
    const causalChain = keyHasNum && wrongHasNum ? 15 : keyHasNum ? 10 : 5;
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
  const withNumeric = judgments.filter((j) =>
    /\d/.test(j.wrongIf ?? ""),
  ).length;
  const withMetric = judgments.filter((j) => !!j.metric).length;

  return {
    score: Math.round(avg),
    reason: `${withNumeric}/${judgments.length} wrongIf conditions have numeric thresholds; ${withMetric}/${judgments.length} have linked metrics.`,
  };
}

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
    return { score: null, reason: "No data points to evaluate freshness." };
  }

  const dayScores: number[] = [];
  for (const j of judgments) {
    const dp = j.dataPoint?.trim();
    if (!dp) {
      dayScores.push(50);
      continue;
    }
    const parsedDate = parseDateFromText(dp);
    if (!parsedDate) {
      dayScores.push(50);
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
  const fresh = dayScores.filter((s) => s >= 80).length;
  const stale = dayScores.filter((s) => s <= 40).length;

  return {
    score: Math.round(avg),
    reason: `${fresh}/${judgments.length} data points are ≤90 days old; ${stale}/${judgments.length} are >6 months old.`,
  };
}

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
    if (!matched) weights.push(0.3);
  }

  const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
  const primary = weights.filter((w) => w >= 0.8).length;
  const secondary = weights.filter((w) => w < 0.5).length;

  return {
    score: Math.round(avg * 100),
    reason: `${primary}/${judgments.length} from primary sources (filings/official); ${secondary}/${judgments.length} from secondary/social.`,
  };
}

function scoreCounterCoverage(
  input: Pick<
    TQSInput,
    "risks" | "thesisBreakers" | "bearCase" | "topJudgments"
  >,
): TQSFactorScore {
  const { risks, thesisBreakers, bearCase, topJudgments } = input;

  const substantiveRisks = risks.filter((r) => {
    const lower = r.toLowerCase().trim();
    return (
      lower.length > 20 &&
      !/^risks?\s*(include|are|may|could|might)/i.test(lower) &&
      !/disclaimer/i.test(lower)
    );
  });
  const riskCountScore =
    substantiveRisks.length >= 3 ? 25 : substantiveRisks.length >= 1 ? 15 : 0;

  const quantifiedRisks = substantiveRisks.filter((r) => /\d/.test(r));
  let quantifiedScore: number;
  if (substantiveRisks.length > 0) {
    const ratio = quantifiedRisks.length / substantiveRisks.length;
    quantifiedScore = ratio >= 0.6 ? 25 : ratio >= 0.3 ? 15 : 5;
  } else {
    quantifiedScore = 0;
  }

  const withWrongIf = topJudgments.filter((j) => {
    const w = j.wrongIf?.trim() ?? "";
    return w.length > 0 && w.toLowerCase() !== "n/a";
  });
  let symmetryScore: number;
  if (topJudgments.length > 0) {
    const ratio = withWrongIf.length / topJudgments.length;
    symmetryScore = ratio >= 1 ? 25 : ratio >= 0.5 ? 15 : 5;
  } else {
    symmetryScore = 0;
  }

  let bearScore: number;
  if (bearCase && bearCase.length > 0) {
    const substantive = bearCase.filter((b) => b.length > 30 && /\d/.test(b));
    bearScore =
      substantive.length >= 2 ? 25 : substantive.length >= 1 ? 15 : 10;
  } else {
    bearScore = thesisBreakers.length > 0 ? 20 : 0;
  }

  const total = riskCountScore + quantifiedScore + symmetryScore + bearScore;

  return {
    score: Math.round(total),
    reason: `${substantiveRisks.length} substantive risks (${quantifiedRisks.length} quantified); ${withWrongIf.length}/${topJudgments.length} judgments have invalidation conditions; bear case ${bearCase && bearCase.length > 0 ? "present" : "absent"}.`,
  };
}

// ── Aggregation ─────────────────────────────────────────────────────────────

/**
 * Weighted average with null-factor handling.
 * When ≥3 of 5 factors are null, cap score at 44 (max D tier).
 * "Can't evaluate" must never produce a score that looks like quality.
 */
function aggregateFactors(factors: TQSFactors): {
  score: number;
  nullCount: number;
  unreliable: boolean;
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

  if (totalWeight === 0) return { score: 0, nullCount, unreliable: true };

  const unreliable = nullCount >= 3;
  const rawScore = Math.round(weightedSum / totalWeight);
  const score = unreliable ? Math.min(rawScore, 44) : rawScore;

  return { score, nullCount, unreliable };
}

function scoreToTier(score: number): TQSTier {
  if (score >= 90) return "S";
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  if (score >= 45) return "C";
  if (score >= 30) return "D";
  return "F";
}

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
  let cappedTier = tier;
  let appliedReason: string | null = null;

  for (const floor of floors) {
    if (!floor.condition) continue;
    const capIdx = tierOrder.indexOf(floor.cap);
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
 */
export function computeTQS(input: TQSInput): TQSResult {
  const factors: TQSFactors = {
    F1_grounding: scoreGrounding(input.landingRate),
    F2_invalidation: scoreInvalidationObservability(input.topJudgments),
    F3_freshness: scoreDataFreshness(input.topJudgments, input.reportDate),
    F4_source: scoreSourceTier(input.topJudgments),
    F5_counter: scoreCounterCoverage(input),
  };

  const { score, unreliable } = aggregateFactors(factors);
  const tier = scoreToTier(score);
  const { tier: finalTier, reason: hardFloorReason } = applyHardFloors(
    tier,
    input,
    factors,
  );

  return {
    score,
    tier: finalTier,
    factors,
    hardFloorApplied: hardFloorReason,
    unreliable,
    disclaimer: TQS_DISCLAIMER,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

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
