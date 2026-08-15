/**
 * AleaBit — Creator source config (#130)
 *
 * Schema for multi-creator source configurations.
 * Each creator has a platform, handle, domain focus, tracked signals,
 * and evidence requirements. Configs are validated at load time.
 *
 * NOT hardcoded to a single account — extensible to any platform/creator.
 */

import { z } from "zod";

// ── Creator source config schema ─────────────────────────────────────────────

export const CreatorSourceConfigSchema = z.object({
  /** Unique identifier (e.g., "aleabitoreddit", "serenity") */
  id: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_-]+$/),

  /** Platform identifier */
  platform: z.enum(["x", "reddit", "youtube", "blog", "rss"]),

  /** Platform handle (without @) */
  handle: z.string().min(1).max(128),

  /** Human-readable display name */
  displayName: z.string().min(1).max(128),

  /** Primary language of content */
  language: z.enum(["en", "zh", "ja", "ko", "multi"]).default("en"),

  /** Financial domains this creator focuses on */
  domains: z
    .array(
      z.enum([
        "equity",
        "crypto",
        "macro",
        "supply_chain",
        "semiconductor",
        "ai",
        "ev",
        "biotech",
        "energy",
        "commodities",
        "forex",
        "fixed_income",
      ]),
    )
    .min(1),

  /** Signal types to track from this creator */
  trackedSignals: z
    .array(
      z.enum([
        "earnings",
        "guidance",
        "supply_chain",
        "management_change",
        "m_and_a",
        "product_launch",
        "regulatory",
        "technical_analysis",
        "macro_commentary",
        "sector_thesis",
      ]),
    )
    .min(1),

  /** Claim types that are considered trustworthy from this creator */
  trustedClaimTypes: z
    .array(
      z.enum([
        "factual_citation",
        "data_reference",
        "primary_source_quote",
        "original_analysis",
        "opinion",
      ]),
    )
    .default(["factual_citation", "data_reference"]),

  /** Claim types that require external evidence regardless of creator trust */
  requiresExternalEvidenceFor: z
    .array(
      z.enum([
        "revenue_number",
        "eps_number",
        "margin_data",
        "guidance_number",
        "market_share",
        "shipment_volume",
        "pricing_data",
        "customer_count",
        "any_financial_metric",
      ]),
    )
    .default(["any_financial_metric"]),

  /** Output formats this creator's content can produce */
  outputFormats: z
    .array(
      z.enum([
        "financial_brief",
        "supply_chain_brief",
        "earnings_snapshot",
        "thesis_note",
        "watchlist_alert",
      ]),
    )
    .default(["financial_brief"]),

  /** Whether this creator is actively ingested */
  enabled: z.boolean().default(true),

  /** Ingest mode */
  ingestMode: z.enum(["live", "shadow", "replay"]).default("replay"),
});

export type CreatorSourceConfig = z.infer<typeof CreatorSourceConfigSchema>;

// ── Validation ───────────────────────────────────────────────────────────────

export interface ConfigValidationResult {
  ok: boolean;
  config?: CreatorSourceConfig;
  errors: string[];
}

export function validateCreatorConfig(raw: unknown): ConfigValidationResult {
  const result = CreatorSourceConfigSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, config: result.data, errors: [] };
  }
  return {
    ok: false,
    errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  };
}

export function validateCreatorConfigs(configs: unknown[]): {
  valid: CreatorSourceConfig[];
  errors: Array<{ index: number; errors: string[] }>;
} {
  const valid: CreatorSourceConfig[] = [];
  const errors: Array<{ index: number; errors: string[] }> = [];

  for (let i = 0; i < configs.length; i++) {
    const result = validateCreatorConfig(configs[i]);
    if (result.ok && result.config) {
      valid.push(result.config);
    } else {
      errors.push({ index: i, errors: result.errors });
    }
  }

  return { valid, errors };
}
