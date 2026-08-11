/**
 * AleaBit Financial Brief Card — Type definitions (#119)
 *
 * Structured output for a single-company earnings/financial brief.
 * Every numeric metric MUST trace back to a source + period + unit.
 * Original post is a trigger/opinion only — never a filing fact.
 */

// ── Trigger post (from X ingestion) ─────────────────────────────────────────

export interface TriggerPost {
  postId: string;
  conversationId: string;
  author: string;
  authorHandle: string;
  text: string;
  postedAt: string; // ISO 8601
  url: string;
  editHistory: string[]; // ordered edit timestamps
  fetchedAt: string;
}

// ── Evidence (extends #116 EvidenceRef) ──────────────────────────────────────

export interface BriefEvidence {
  id: string;
  claim: string;
  source: string; // "SEC 10-K", "Company IR", "author_claim", etc.
  date: string; // filing date or report period
  url?: string;
  unit?: string; // "USD", "KRW", "%", "x", etc.
  fiscalPeriod?: string; // "FY2026 Q2", "FY2026", etc.
  confidence: "verified" | "partial" | "unverified";
}

// ── Metric ───────────────────────────────────────────────────────────────────

export interface BriefMetric {
  name: string; // "Revenue", "EPS", "Gross Margin", etc.
  value: number | null; // null = data unavailable (not zero)
  unit: string; // "USD", "%", "x", etc.
  period: string; // "FY2026 Q2", "FY2026", etc.
  yoyChange?: number | null; // percent, null = unavailable
  qoqChange?: number | null; // percent, null = unavailable
  source: string; // evidence ID
  isEstimate?: boolean; // true if from analyst estimate, not filing
}

// ── Guidance ─────────────────────────────────────────────────────────────────

export interface GuidanceChange {
  metric: string;
  previous: string;
  updated: string;
  direction: "raised" | "lowered" | "maintained" | "initiated";
  period: string; // which quarter/year the guidance covers
  source: string; // evidence ID
}

// ── Driver / Risk ────────────────────────────────────────────────────────────

export interface BriefDriver {
  description: string;
  evidenceIds: string[];
}

export interface BriefRisk {
  description: string;
  falsifier?: string; // what would prove this wrong
  evidenceIds: string[];
}

// ── Classification result ────────────────────────────────────────────────────

export type ContentCategory = "earnings" | "company" | "supply_chain" | "other";

export interface ClassificationResult {
  category: ContentCategory;
  confidence: number; // 0-1
  reasoning: string;
  skipReason?: string; // only when category === "other"
}

// ── Entity resolution result ─────────────────────────────────────────────────

export interface EntityResolution {
  ok: boolean;
  ticker?: string;
  companyName?: string;
  exchange?: string;
  market?: string; // "US", "HK", "A-share", etc.
  confidence: number;
  needsReview: boolean;
  reviewReason?: string;
}

// ── Full brief card ──────────────────────────────────────────────────────────

export interface FinancialBriefCard {
  schema_version: 1;

  // Provenance
  triggerPost: TriggerPost;
  authorThesis: string; // extracted opinion from the post

  // Entity
  company: string;
  ticker: string;
  market: string;
  reportPeriod: string; // "FY2026 Q2", "FY2026", etc.
  publishedAt: string; // when this brief was generated

  // Data
  metrics: BriefMetric[];
  guidanceChanges: GuidanceChange[];
  drivers: BriefDriver[];
  risksOrFalsifiers: BriefRisk[];
  supplyChainBottleneck?: string;

  // Meta
  limitations: string[]; // what we couldn't verify
  sources: BriefEvidence[];
  disclaimer: string;
}

// ── Processing status ────────────────────────────────────────────────────────

export type BriefStatus =
  | "detected"
  | "researching"
  | "ready_for_review"
  | "needs_review"
  | "skipped"
  | "failed";

export interface BriefProcessingRecord {
  conversationId: string;
  editHistory: string[];
  status: BriefStatus;
  category?: ContentCategory;
  entity?: EntityResolution;
  brief?: FinancialBriefCard;
  skipReason?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}
