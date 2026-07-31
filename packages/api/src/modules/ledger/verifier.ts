/**
 * L3 Ledger Verification Engine — Pure Functions
 *
 * Deterministic rule engine for evaluating `wrongIf` conditions against
 * current financial data. No LLM, no side effects.
 *
 * Four-state outcome:
 *   - confirmed: data fetchable + wrongIf NOT triggered
 *   - invalidated: data fetchable + wrongIf triggered
 *   - needs_manual_review: wrongIf not machine-verifiable OR metric unextractable
 *   - insufficient_data: data source completely unreachable
 *
 * See: docs/product/L3-LEDGER-VERIFICATION-LOOP.md
 */

import type { FinancialMetrics } from "@workspace/shared/types/report";

// Re-export for test imports
export type { FinancialMetrics } from "@workspace/shared/types/report";

// ── Types ───────────────────────────────────────────────────────────────────

export type VerificationOutcome =
  | "confirmed"
  | "invalidated"
  | "needs_manual_review"
  | "insufficient_data";

export interface ParsedCondition {
  metric: string; // e.g. "revenueGrowthYoy", "grossMargin"
  operator: "<" | ">" | "<=" | ">=" | "==" | "!=";
  threshold: number;
  unit?: string; // "%", "$B", etc.
  machineVerifiable: boolean;
}

export interface EvaluationResult {
  triggered: boolean;
  explanation: string;
}

export interface VerifiableJudgment {
  id: string;
  ticker: string;
  judgment: string;
  keyNumber: string;
  wrongIf: string;
  metric?: string | null;
  trigger?: string | null;
  source?: string | null;
}

// ── Metric name mapping ─────────────────────────────────────────────────────

/**
 * Map common metric names (from wrongIf text or metric field) to
 * FinancialMetrics property names.
 */
const METRIC_ALIASES: Record<string, keyof FinancialMetrics> = {
  // Revenue & growth
  revenue: "revenue",
  revenuegrowth: "revenueGrowthYoy",
  revenuegrowthyoy: "revenueGrowthYoy",
  "revenue growth": "revenueGrowthYoy",
  "revenue growth yoy": "revenueGrowthYoy",
  // Margins
  grossmargin: "grossMargin",
  "gross margin": "grossMargin",
  operatingmargin: "operatingMargin",
  "operating margin": "operatingMargin",
  netmargin: "netMargin",
  "net margin": "netMargin",
  fcfmargin: "fcfMargin",
  "fcf margin": "fcfMargin",
  // Profitability
  eps: "eps",
  "eps growth": "epsGrowthYoy",
  epsgrowthyoy: "epsGrowthYoy",
  "earnings per share": "eps",
  // Balance sheet
  totalcash: "totalCash",
  "total cash": "totalCash",
  totaldebt: "totalDebt",
  "total debt": "totalDebt",
  netcash: "netCash",
  "net cash": "netCash",
  // Valuation
  peratio: "peRatio",
  "p/e": "peRatio",
  "p/e ratio": "peRatio",
  pbratio: "pbRatio",
  "p/b": "pbRatio",
  psratio: "psRatio",
  "p/s": "psRatio",
  evebitda: "evEbitda",
  "ev/ebitda": "evEbitda",
  // Cash flow
  freecashflow: "freeCashFlow",
  "free cash flow": "freeCashFlow",
  fcf: "freeCashFlow",
  // Market cap
  marketcap: "marketCap",
  "market cap": "marketCap",
};

/**
 * Resolve a metric name (from wrongIf text or metric field) to a
 * FinancialMetrics key. Returns null if unresolvable.
 */
export function resolveMetricName(
  rawName: string | null | undefined,
): keyof FinancialMetrics | null {
  if (!rawName) return null;
  const normalized = rawName.trim().toLowerCase();
  // Direct property name match
  if (normalized in METRIC_ALIASES) {
    return METRIC_ALIASES[normalized]!;
  }
  // Partial match: check if any alias key is contained in the normalized text
  // Sort by alias length descending to prefer longer (more specific) matches
  const sortedAliases = Object.entries(METRIC_ALIASES).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [alias, key] of sortedAliases) {
    if (normalized.includes(alias)) {
      return key;
    }
  }
  return null;
}

// ── isMachineVerifiable ─────────────────────────────────────────────────────

/**
 * Determine if a judgment's wrongIf condition can be evaluated by machine.
 *
 * Returns false for qualitative conditions like:
 *   - "Management loses confidence"
 *   - "Key customer churns"
 *   - "Market sentiment shifts"
 *
 * Returns true for numeric comparisons like:
 *   - "Revenue growth drops below 8%"
 *   - "Gross margin falls below 65%"
 *   - "P/E exceeds 30x"
 */
export function isMachineVerifiable(judgment: VerifiableJudgment): boolean {
  const wrongIf = judgment.wrongIf?.trim() ?? "";
  if (!wrongIf) return false;

  // Has a numeric comparison pattern?
  const hasNumericComparison =
    /[<>]=?\s*\d/.test(wrongIf) ||
    /(?:drops?|falls?|exceeds?|rises?|climbs?|declines?|below|above|under|over)\s*\d/i.test(
      wrongIf,
    );

  // Has a resolvable metric?
  const metricField = resolveMetricName(judgment.metric);
  const metricFromText = resolveMetricName(wrongIf);
  const hasMetric = metricField !== null || metricFromText !== null;

  return hasNumericComparison && hasMetric;
}

// ── parseWrongIf ────────────────────────────────────────────────────────────

/**
 * Parse a wrongIf string into a structured condition.
 *
 * Handles patterns like:
 *   - "Revenue growth drops below 8%" → { metric: "revenueGrowthYoy", operator: "<", threshold: 8, unit: "%" }
 *   - "Gross margin falls below 65%" → { metric: "grossMargin", operator: "<", threshold: 65, unit: "%" }
 *   - "P/E exceeds 30x" → { metric: "peRatio", operator: ">", threshold: 30, unit: "x" }
 *   - "EPS falls under $1.50" → { metric: "eps", operator: "<", threshold: 1.50, unit: "$" }
 *   - ">65%" → { metric: ..., operator: ">", threshold: 65, unit: "%" }
 *   - "<8%" → { metric: ..., operator: "<", threshold: 8, unit: "%" }
 *
 * Returns null if the condition cannot be parsed.
 */
export function parseWrongIf(
  wrongIf: string,
  metric?: string | null,
): ParsedCondition | null {
  if (!wrongIf?.trim()) return null;

  const text = wrongIf.trim();

  // Resolve metric from the explicit metric field first, then from text
  const resolvedMetric = resolveMetricName(metric) ?? resolveMetricName(text);
  if (!resolvedMetric) return null;

  // Extract operator + threshold
  // Pattern 1: explicit comparison words + number
  //   "drops below 8%", "falls below 65%", "exceeds 30x", "rises above 50"
  const wordPattern =
    /(?:drops?|falls?|declines?|decreases?|under|below)\s+(\$?[\d,.]+)\s*(%|x|X|B|M|b|m)?/i;
  const wordMatch = text.match(wordPattern);
  if (wordMatch) {
    const threshold = parseFloat((wordMatch[1] ?? "0").replace(/[$,]/g, ""));
    const unit = wordMatch[2] || inferUnit(resolvedMetric);
    if (!isNaN(threshold)) {
      return {
        metric: resolvedMetric as string,
        operator: "<",
        threshold,
        unit,
        machineVerifiable: true,
      };
    }
  }

  const exceedPattern =
    /(?:exceeds?|surpasses?|climbs?|rises?|above|over)\s+(\$?[\d,.]+)\s*(%|x|X|B|M|b|m)?/i;
  const exceedMatch = text.match(exceedPattern);
  if (exceedMatch) {
    const threshold = parseFloat((exceedMatch[1] ?? "0").replace(/[$,]/g, ""));
    const unit = exceedMatch[2] || inferUnit(resolvedMetric);
    if (!isNaN(threshold)) {
      return {
        metric: resolvedMetric as string,
        operator: ">",
        threshold,
        unit,
        machineVerifiable: true,
      };
    }
  }

  // Pattern 2: symbolic operators — "<8%", ">30x", "<=65%", ">=1.50"
  const symbolicPattern = /([<>]=?)\s*(\$?[\d,.]+)\s*(%|x|X|B|M|b|m)?/;
  const symbolicMatch = text.match(symbolicPattern);
  if (symbolicMatch) {
    const op = symbolicMatch[1] as ParsedCondition["operator"];
    const threshold = parseFloat(
      (symbolicMatch[2] ?? "0").replace(/[$,]/g, ""),
    );
    const unit = symbolicMatch[3] || inferUnit(resolvedMetric);
    if (!isNaN(threshold)) {
      return {
        metric: resolvedMetric as string,
        operator: op,
        threshold,
        unit,
        machineVerifiable: true,
      };
    }
  }

  // Pattern 3: trigger field (e.g. "<65%", ">30x")
  // This is a fallback if wrongIf text doesn't contain a parseable pattern
  // but the judgment has a structured trigger field.
  return null;
}

// ── evaluateCondition ───────────────────────────────────────────────────────

/**
 * Evaluate a parsed condition against the current value.
 * Pure function — no side effects.
 */
export function evaluateCondition(
  condition: ParsedCondition,
  currentValue: number,
): EvaluationResult {
  if (
    currentValue === null ||
    currentValue === undefined ||
    isNaN(currentValue)
  ) {
    return {
      triggered: false,
      explanation: `Cannot evaluate: current value is ${String(currentValue)}`,
    };
  }

  const { operator, threshold, metric, unit } = condition;
  const unitStr = unit ?? "";
  const metricLabel = metric;

  let triggered: boolean;
  switch (operator) {
    case "<":
      triggered = currentValue < threshold;
      break;
    case ">":
      triggered = currentValue > threshold;
      break;
    case "<=":
      triggered = currentValue <= threshold;
      break;
    case ">=":
      triggered = currentValue >= threshold;
      break;
    case "==":
      triggered = currentValue === threshold;
      break;
    case "!=":
      triggered = currentValue !== threshold;
      break;
    default: {
      return {
        triggered: false,
        explanation: `Unknown operator: ${String(operator)}`,
      };
    }
  }

  return {
    triggered,
    explanation: triggered
      ? `${metricLabel} = ${currentValue}${unitStr} ${operator} ${threshold}${unitStr} → condition triggered (invalidated)`
      : `${metricLabel} = ${currentValue}${unitStr}, threshold ${operator} ${threshold}${unitStr} → condition NOT triggered (confirmed)`,
  };
}

// ── extractMetricValue ──────────────────────────────────────────────────────

/**
 * Extract a named metric value from FinancialMetrics.
 * Returns null if the metric doesn't exist or is null/undefined.
 * Pure function — no side effects.
 */
export function extractMetricValue(
  metrics: FinancialMetrics,
  metricName: string,
): number | null {
  if (!metrics || !metricName) return null;

  const key = metricName as keyof FinancialMetrics;
  const value = metrics[key];

  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;

  // Try parsing string values
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[$,%]/g, ""));
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Infer default unit from metric name.
 */
function inferUnit(metric: string): string {
  const m = metric.toLowerCase();
  if (
    m.includes("margin") ||
    m.includes("growth") ||
    m.includes("yoy") ||
    m.includes("change")
  ) {
    return "%";
  }
  // Word-boundary-ish checks to avoid "eps" matching "ps" (psRatio)
  if (
    /^pe|^p\/e|ratio|evebitda|^ev|^pb|^ps$/.test(m) ||
    m === "peratio" ||
    m === "pbratio" ||
    m === "psratio" ||
    m === "evEbitda"
  ) {
    return "x";
  }
  return "";
}

/**
 * Zero/null guard — a value that is exactly 0.0 or "0.0%" is suspicious
 * and should not be used to confirm a judgment. This is the "0.0% fallback"
 * redline from Gate 3.
 */
export function isSuspiciouslyZero(value: number | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  return value === 0;
}

// ── verifyJudgment ──────────────────────────────────────────────────────────

export interface JudgmentVerificationResult {
  result: VerificationOutcome;
  dataPoint: string;
  evidenceUrl: string;
  notes: string;
}

/**
 * Verify a single judgment against current financial metrics.
 * Pure function — no side effects, no DB access.
 *
 * Redline: NEVER auto-confirm when data is missing or wrongIf is unparseable.
 */
export function verifyJudgment(
  judgment: {
    id: string;
    ticker: string;
    judgment: string;
    keyNumber: string;
    wrongIf: string;
    metric?: string | null;
    trigger?: string | null;
  },
  metrics: FinancialMetrics,
): JudgmentVerificationResult {
  const ticker = judgment.ticker;
  const evidenceUrl = `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/`;

  // Redline: qualitative wrongIf → needs_manual_review
  if (!isMachineVerifiable(judgment)) {
    return {
      result: "needs_manual_review",
      dataPoint: "N/A — wrongIf not machine-verifiable",
      evidenceUrl,
      notes: `wrongIf "${judgment.wrongIf}" contains qualitative or event-based conditions that cannot be automatically evaluated.`,
    };
  }

  // Parse the condition
  const condition = parseWrongIf(judgment.wrongIf, judgment.metric);
  if (!condition) {
    return {
      result: "needs_manual_review",
      dataPoint: "N/A — could not parse wrongIf",
      evidenceUrl,
      notes: `Failed to parse wrongIf "${judgment.wrongIf}" into a machine-evaluable condition.`,
    };
  }

  // Extract current value
  const currentValue = extractMetricValue(metrics, condition.metric);
  if (currentValue === null) {
    return {
      result: "needs_manual_review",
      dataPoint: `Metric "${condition.metric}" not available`,
      evidenceUrl,
      notes: `Could not extract metric "${condition.metric}" from market data for ${ticker}.`,
    };
  }

  // Redline: 0.0% suspicious — needs manual review
  if (isSuspiciouslyZero(currentValue)) {
    return {
      result: "needs_manual_review",
      dataPoint: `${condition.metric}: ${currentValue}${condition.unit ?? ""} (suspicious zero)`,
      evidenceUrl,
      notes: `Metric "${condition.metric}" is exactly 0 — this may indicate missing data rather than a real value. Needs manual verification.`,
    };
  }

  // Evaluate the condition
  const evaluation = evaluateCondition(condition, currentValue);

  return {
    result: evaluation.triggered ? "invalidated" : "confirmed",
    dataPoint: `${condition.metric}: ${currentValue}${condition.unit ?? ""}`,
    evidenceUrl,
    notes: evaluation.explanation,
  };
}
