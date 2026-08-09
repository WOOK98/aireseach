import { z } from "zod";

// ─── Industry Research Brief v1 — Zod Schema ─────────────────────────────────
// Validates LLM output structure. Used in both runtime parsing and fixture tests.
// Source: adapted from Guan-Yep/industry-research (MIT License)

/** Confidence level for data points */
export const ConfidenceSchema = z.enum(["verified", "partial", "unverified"]);

/** Bottleneck strength per value chain layer */
export const BottleneckStrengthSchema = z.enum([
  "strong",
  "moderate",
  "weak",
  "none",
]);

/** A key player in the value chain */
export const ValueChainPlayerSchema = z.object({
  ticker: z.string().min(1),
  name: z.string().min(1),
  exchange: z.string().min(1),
  role: z.string().min(1),
});

/** A node in the industry value chain */
export const ValueChainNodeSchema = z.object({
  layer: z.string().min(1),
  description: z.string().min(1),
  keyPlayers: z.array(ValueChainPlayerSchema),
  bottleneckStrength: BottleneckStrengthSchema,
});

/** A single market estimate (TAM/SAM/SOM) */
export const MarketEstimateSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  methodology: z.enum(["top-down", "bottom-up", "both"]),
  source: z.string().min(1),
  confidence: ConfidenceSchema,
});

/** TAM / SAM / SOM market sizing */
export const MarketSizingSchema = z.object({
  tam: MarketEstimateSchema,
  sam: MarketEstimateSchema,
  som: MarketEstimateSchema,
  crossValidationNote: z.string().optional(),
});

/** Historical market size data point */
export const MarketSizePointSchema = z.object({
  year: z.string().min(1),
  size: z.string().min(1),
  growthRate: z.string().optional(),
  source: z.string().min(1),
});

/** Competitive concentration metrics */
export const CompetitionMetricsSchema = z.object({
  cr3: z.string().nullable(),
  cr5: z.string().nullable(),
  hhi: z.string().nullable(),
  trend: z.enum(["consolidating", "fragmenting", "stable", "unknown"]),
  shareAttribution: z
    .object({
      brand: z.string(),
      channel: z.string(),
      price: z.string(),
      innovation: z.string(),
    })
    .optional(),
});

/** A competitive share entry */
export const ShareEntrySchema = z.object({
  player: z.string().min(1),
  ticker: z.string().optional(),
  share: z.string().min(1),
  change: z.string().optional(),
  source: z.string().min(1),
});

/** Source with 7-tier priority classification */
export const SourceEntrySchema = z.object({
  name: z.string().min(1),
  tier: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
  ]),
  tierLabel: z.string(),
  url: z.string().url().optional(),
  claim: z.string().min(1),
  date: z.string().optional(),
  confidence: ConfidenceSchema,
});

/** Follow-up candidate for deep dive */
export const FollowUpCandidateSchema = z.object({
  ticker: z.string().min(1),
  name: z.string().min(1),
  exchange: z.string().min(1),
  reason: z.string().min(1),
});

/** The complete Industry Research Brief schema */
export const IndustryBriefSchema = z.object({
  definition: z.string().min(1),
  valueChain: z.array(ValueChainNodeSchema).min(1),
  marketSizing: MarketSizingSchema,
  marketSizeHistory: z.array(MarketSizePointSchema),
  competition: CompetitionMetricsSchema,
  shareBreakdown: z.array(ShareEntrySchema),
  sources: z.array(SourceEntrySchema).min(1),
  limitations: z.array(z.string()),
  followUpCandidates: z.array(FollowUpCandidateSchema),
});

/** Inferred TypeScript type from schema */
export type IndustryBriefValidated = z.infer<typeof IndustryBriefSchema>;

/**
 * Parse and validate an LLM output against the IndustryBrief schema.
 * Returns either a validated brief or a list of validation errors.
 */
export function parseIndustryBrief(
  raw: unknown,
):
  | { ok: true; data: IndustryBriefValidated }
  | { ok: false; errors: string[] } {
  const result = IndustryBriefSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return {
    ok: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    ),
  };
}
