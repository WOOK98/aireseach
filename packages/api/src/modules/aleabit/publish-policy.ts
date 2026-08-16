/**
 * AleaBit — Publish policy evaluator (#137)
 *
 * Pure function: takes a QueueItem + rollout config → returns structured decision.
 * Determines whether a queue item can progress to `ready_for_publish`.
 *
 * This is the policy GATE, not the publisher.
 * No X write. No media upload. No reply API.
 */

import type { QueueItem } from "./queue-interface";

// ── Rollout mode ─────────────────────────────────────────────────────────────

export type RolloutMode = "off" | "shadow" | "canary" | "auto";

// ── Policy decision ──────────────────────────────────────────────────────────

export type PolicyVerdict = "allowed" | "blocked" | "shadow_only";

export interface PolicyDecision {
  verdict: PolicyVerdict;
  blockingReasons: string[];
  checkedAt: string;
  policyVersion: number;
  rolloutMode: RolloutMode;
  queueItemId: string;
  creatorId: string;
  conversationId: string;
}

// ── Policy version ───────────────────────────────────────────────────────────

export const CURRENT_POLICY_VERSION = 1;

// ── Prohibited terms (target price / rating / position sizing) ───────────────

const PROHIBITED_PATTERNS = [
  // Price targets
  /\bprice\s*target\b/i,
  /\btarget\s*price\b/i,
  /\bpt\s*\$/i,
  /\b\$\d+.*\btarget\b/i,
  // Buy/sell/hold ratings
  /\b(buy|sell|hold|overweight|underweight|outperform|underperform)\s*(rating|recommendation)?\b/i,
  /\brating\s*:\s*(buy|sell|hold|overweight|underweight)\b/i,
  // Position sizing
  /\bposition\s*size\b/i,
  /\bportfolio\s*weight\b/i,
  /\ballocation\s*%\b/i,
  /\b\d+%\s*(of\s*)?(portfolio|position|allocation)\b/i,
];

function hasProhibitedContent(text: string): boolean {
  return PROHIBITED_PATTERNS.some((p) => p.test(text));
}

// ── Policy evaluator ─────────────────────────────────────────────────────────

export interface PolicyInput {
  item: QueueItem;
  rolloutMode: RolloutMode;
}

/**
 * Evaluate publish policy for a queue item.
 * Returns a structured decision with blocking reasons.
 *
 * Pure function — no side effects, no DB writes.
 */
export function evaluatePublishPolicy(input: PolicyInput): PolicyDecision {
  const { item, rolloutMode } = input;
  const reasons: string[] = [];

  // 1. Queue status must be ready_for_review or approved
  const publishableStatuses = ["ready_for_review", "approved"];
  if (!publishableStatuses.includes(item.status)) {
    reasons.push(
      `Queue status is '${item.status}', not ready_for_review/approved.`,
    );
  }

  // 2. Entity must be resolved and unique
  if (!item.entity) {
    reasons.push("Entity resolution missing.");
  } else if (!item.entity.ok) {
    reasons.push(
      `Entity resolution failed: ${item.entity.reviewReason ?? "unknown"}`,
    );
  } else if (item.entity.needsReview) {
    reasons.push(
      `Entity needs review: ${item.entity.reviewReason ?? "ambiguous"}`,
    );
  }

  // 3. Brief must exist
  if (!item.brief) {
    reasons.push("Financial brief card missing.");
  }

  // 4. Bilingual PNG hashes must exist (both locales)
  if (!item.renderedPngHashZh) {
    reasons.push("zh-CN PNG artifact missing.");
  }
  if (!item.renderedPngHashEn) {
    reasons.push("en PNG artifact missing.");
  }

  // 5. Brief content checks (only if brief exists)
  if (item.brief) {
    // 5a. All metrics must have source, period, unit
    for (const m of item.brief.metrics) {
      if (!m.source) {
        reasons.push(`Metric '${m.name}' missing source.`);
      }
      if (!m.period) {
        reasons.push(`Metric '${m.name}' missing period.`);
      }
      if (!m.unit) {
        reasons.push(`Metric '${m.name}' missing unit.`);
      }
    }

    // 5b. No target price / rating / position sizing
    const allText = [
      item.brief.authorThesis,
      ...item.brief.drivers.map((d) => d.description),
      ...item.brief.risksOrFalsifiers.map((r) => r.description),
    ].join("\n");

    if (hasProhibitedContent(allText)) {
      reasons.push(
        "Brief contains prohibited content (target price / rating / position sizing).",
      );
    }

    // 5c. Disclaimer must be present
    if (!item.brief.disclaimer || item.brief.disclaimer.trim().length === 0) {
      reasons.push("Disclaimer missing.");
    }

    // 5d. Ticker and company must be present
    if (!item.brief.ticker) {
      reasons.push("Ticker missing.");
    }
    if (!item.brief.company) {
      reasons.push("Company name missing.");
    }
  }

  // 6. Determine verdict based on rollout mode
  let verdict: PolicyVerdict;
  if (reasons.length > 0) {
    verdict = "blocked";
  } else if (rolloutMode === "off") {
    verdict = "blocked";
    reasons.push("Rollout mode is 'off'.");
  } else if (rolloutMode === "shadow") {
    verdict = "shadow_only";
  } else {
    // canary or auto — allowed (UI/API layer enforces human approve for canary)
    verdict = "allowed";
  }

  return {
    verdict,
    blockingReasons: reasons,
    checkedAt: new Date().toISOString(),
    policyVersion: CURRENT_POLICY_VERSION,
    rolloutMode,
    queueItemId: item.id,
    creatorId: item.creatorId,
    conversationId: item.conversationId,
  };
}
