/**
 * Research Article — Data gate pure functions (#116)
 *
 * Extracted from route.ts for testability (no side-effect imports).
 * Determines whether enough verified input exists to justify an LLM call.
 */
import type { FinancialMetrics } from "@workspace/shared/types/report";

// ── Data gate: require at least one verified input ───────────────────────────

export interface InputSpine {
  hasFinancials: boolean;
  hasIndustryData: boolean;
  hasImaKnowledge: boolean;
  verifiedSources: string[];
}

export function buildInputSpine(
  financials: FinancialMetrics | null,
  industryData: string,
  imaContext: string,
): InputSpine {
  const sources: string[] = [];

  if (financials) {
    sources.push(
      `${financials.companyName} (${financials.ticker ?? "N/A"}) 财务数据 via verified market data`,
    );
  }
  if (industryData) {
    sources.push("产业 ETF 成分股数据");
  }
  if (imaContext) {
    sources.push("IMA 知识库文献");
  }

  return {
    hasFinancials: !!financials,
    hasIndustryData: !!industryData,
    hasImaKnowledge: !!imaContext,
    verifiedSources: sources,
  };
}

export function hasVerifiedInput(spine: InputSpine): boolean {
  // At least one of: financials, industry data, or IMA knowledge
  return spine.hasFinancials || spine.hasIndustryData || spine.hasImaKnowledge;
}

// ── Numeric formatting ──────────────────────────────────────────────────────

export const fmt = (n: number | null | undefined, decimals = 1) =>
  n == null ? "N/A" : n.toFixed(decimals);

export const fmtB = (n: number | null | undefined) => {
  if (n == null || !Number.isFinite(n)) return "N/A";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
};
