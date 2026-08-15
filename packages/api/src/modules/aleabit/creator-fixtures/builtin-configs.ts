/**
 * AleaBit — Built-in creator config fixtures (#130)
 *
 * Pre-configured creator configs for testing and demo.
 * Handles are configurable — business logic never hardcodes to names.
 */

import type { CreatorSourceConfig } from "../creator-config";

/**
 * AleaBitoreddit — equity/supply chain focused, English.
 * Primary: semiconductor, AI, supply chain analysis.
 */
export const ALEABIT_CREATOR_CONFIG: CreatorSourceConfig = {
  id: "aleabitoreddit",
  platform: "x",
  handle: "aleabitoreddit",
  displayName: "AleaBit",
  language: "en",
  domains: ["equity", "semiconductor", "ai", "supply_chain"],
  trackedSignals: [
    "earnings",
    "guidance",
    "supply_chain",
    "product_launch",
    "sector_thesis",
  ],
  trustedClaimTypes: [
    "factual_citation",
    "data_reference",
    "original_analysis",
  ],
  requiresExternalEvidenceFor: ["any_financial_metric"],
  outputFormats: ["financial_brief", "supply_chain_brief"],
  enabled: true,
  ingestMode: "replay",
};

/**
 * Serenity — crypto/macro focused, bilingual (en/zh).
 * Primary: macro commentary, sector analysis.
 */
export const SERENITY_CREATOR_CONFIG: CreatorSourceConfig = {
  id: "serenity",
  platform: "x",
  handle: "serenity",
  displayName: "Serenity",
  language: "multi",
  domains: ["equity", "macro", "ai"],
  trackedSignals: [
    "earnings",
    "macro_commentary",
    "sector_thesis",
    "management_change",
  ],
  trustedClaimTypes: [
    "factual_citation",
    "data_reference",
    "original_analysis",
  ],
  requiresExternalEvidenceFor: ["any_financial_metric"],
  outputFormats: ["financial_brief", "thesis_note"],
  enabled: true,
  ingestMode: "replay",
};

/**
 * All built-in creator configs.
 */
export const BUILTIN_CREATOR_CONFIGS: CreatorSourceConfig[] = [
  ALEABIT_CREATOR_CONFIG,
  SERENITY_CREATOR_CONFIG,
];
