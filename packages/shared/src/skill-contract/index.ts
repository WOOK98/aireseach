/**
 * Shared Analysis Contract
 *
 * Single source of truth for analysis methodology = the skill mirrors in
 * skills/. Build-time generation inlines them as .ts constants so the
 * runtime never reads disk. See: #67
 *
 * Pipeline:
 *   skills/*.md → scripts/generate-skill-contract.mjs → generated.ts
 *   check-skill-mirrors.mjs verifies the mirrors match the plugin source.
 *
 * ONE EDIT TO THE SKILL = REGENERATE + BOTH OUTPUTS CHANGE.
 */

// Re-export all generated constants (single source: generate-skill-contract.mjs)
export {
  DEEP_DIVE_METHODOLOGY,
  FILING_METHODOLOGY,
  SHARED_HARD_RULES,
  MONITOR_JSON_SCHEMA,
  MODE_PERSPECTIVES,
  type AnalysisMode,
} from "./generated";
