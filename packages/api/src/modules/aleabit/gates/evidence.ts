/**
 * AleaBit — Evidence gate (pure function) (#119)
 *
 * Determines whether enough verified evidence exists to generate a
 * financial brief card. Financial numbers must come from SEC/IR,
 * not from the original post or third-party sources.
 *
 * The post is a trigger/opinion source only.
 *
 * STRICT RULE: Every metric must trace to a filing-grade evidence item.
 * "verified" alone is not enough — the source must be SEC/IR/filing.
 */
import type {
  BriefEvidence,
  BriefMetric,
} from "@workspace/shared/types/aleabit";

// ── Filing-grade source whitelist ────────────────────────────────────────────

const FILING_SOURCES = new Set([
  "SEC 10-K",
  "SEC 10-Q",
  "SEC 8-K",
  "SEC filing",
  "SEC EDGAR",
  "Company IR",
  "Earnings Release",
  "Investor Presentation",
]);

export function isFilingSource(source: string): boolean {
  if (FILING_SOURCES.has(source)) return true;
  const lower = source.toLowerCase();
  return (
    lower.includes("sec") ||
    lower.includes("10-k") ||
    lower.includes("10-q") ||
    lower.includes("8-k") ||
    lower.includes("filing") ||
    lower.includes("edgar") ||
    (lower.includes("ir") &&
      !lower.includes("wire") &&
      !lower.includes("ireland"))
  );
}

// ── Evidence spine ───────────────────────────────────────────────────────────

export interface EvidenceSpine {
  hasFilingEvidence: boolean;
  hasMetricEvidence: boolean; // every metric points to filing-grade evidence
  hasAuthorClaim: boolean;
  verifiedCount: number;
  filingGradeCount: number; // verified + filing source
  partialCount: number;
  unverifiedCount: number;
  nonFilingMetrics: string[]; // metric names that don't trace to filing
}

export function buildEvidenceSpine(
  evidence: BriefEvidence[],
  metrics: BriefMetric[],
): EvidenceSpine {
  const filingEvidence = evidence.filter(
    (e) => e.confidence === "verified" && isFilingSource(e.source),
  );

  const nonFilingMetrics: string[] = [];
  for (const m of metrics) {
    const ev = evidence.find((e) => e.id === m.source);
    if (!ev || ev.confidence !== "verified" || !isFilingSource(ev.source)) {
      nonFilingMetrics.push(m.name);
    }
  }

  return {
    hasFilingEvidence: filingEvidence.length > 0,
    hasMetricEvidence: nonFilingMetrics.length === 0 && metrics.length > 0,
    hasAuthorClaim: evidence.some((e) => e.source === "author_claim"),
    verifiedCount: evidence.filter((e) => e.confidence === "verified").length,
    filingGradeCount: filingEvidence.length,
    partialCount: evidence.filter((e) => e.confidence === "partial").length,
    unverifiedCount: evidence.filter((e) => e.confidence === "unverified")
      .length,
    nonFilingMetrics,
  };
}

// ── Gate decision ────────────────────────────────────────────────────────────

export interface EvidenceGateResult {
  allowed: boolean;
  reason: string;
  spine: EvidenceSpine;
}

export function evidenceGate(
  evidence: BriefEvidence[],
  metrics: BriefMetric[],
): EvidenceGateResult {
  const spine = buildEvidenceSpine(evidence, metrics);

  // No filing-grade evidence at all
  if (!spine.hasFilingEvidence) {
    return {
      allowed: false,
      reason:
        "No SEC/IR filing evidence found. Financial numbers cannot be verified. Degraded to needs_review.",
      spine,
    };
  }

  // Every metric must trace to filing-grade evidence
  if (spine.nonFilingMetrics.length > 0) {
    return {
      allowed: false,
      reason: `Metrics not backed by SEC/IR evidence: ${spine.nonFilingMetrics.join(", ")}. Every numeric claim must trace to filing-grade source.`,
      spine,
    };
  }

  return {
    allowed: true,
    reason: `${spine.filingGradeCount} filing-grade evidence(s), ${metrics.length} metric(s) all backed by SEC/IR.`,
    spine,
  };
}
