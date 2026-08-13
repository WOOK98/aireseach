import {
  NVDA_EVIDENCE,
  NVDA_METRICS,
  buildNVDABrief,
} from "./fixtures/fixture-evidence";
import { ReplayAdapter } from "./fixtures/replay-adapter";
import { classifyContent } from "./gates/classify";
import { resolveEntity } from "./gates/entity";
import { evidenceGate } from "./gates/evidence";
import { ReviewQueue } from "./queue";
import { renderBriefCard, renderDegradedCard } from "./renderer";

import type { IReviewQueue, QueueItem } from "./queue-interface";
/**
 * AleaBit — Shadow-run runner (#121 #126)
 *
 * Processes replay fixtures through the full pipeline:
 * ingestion → classification → entity gate → evidence gate →
 * brief generation → queue
 *
 * For the NVDA fixture, filing-grade evidence and metrics are provided
 * so the evidence gate passes and a real brief card is generated.
 * Other fixtures use author_claim only (gate blocks → needs_review).
 *
 * Used for testing and shadow-runs. Never touches production X API.
 *
 * Accepts an optional queue parameter — pass PersistentReviewQueue for
 * persistent storage, or omit for in-memory (tests/shadow-runs).
 */
import type {
  TriggerPost,
  FinancialBriefCard,
} from "@workspace/shared/types/aleabit";

// ── Shadow-run result ────────────────────────────────────────────────────────

export interface ShadowRunResult {
  queue: IReviewQueue;
  items: QueueItem[];
  summary: {
    total: number;
    readyForReview: number;
    needsReview: number;
    skipped: number;
    failed: number;
  };
}

// ── Fixture evidence map ─────────────────────────────────────────────────────
// Maps conversationId → filing-grade evidence + metrics for shadow-run.
// Only the NVDA fixture has real filing data; others use author_claim only.

interface FixtureData {
  evidence: typeof NVDA_EVIDENCE;
  metrics: typeof NVDA_METRICS;
  buildBrief: (rootPost: TriggerPost) => FinancialBriefCard;
}

const FIXTURE_EVIDENCE_MAP: Record<string, FixtureData> = {
  conv_nvda_earnings_q2: {
    evidence: NVDA_EVIDENCE,
    metrics: NVDA_METRICS,
    buildBrief: buildNVDABrief,
  },
};

// ── Process single thread ────────────────────────────────────────────────────

async function processThread(
  queue: IReviewQueue,
  rootPost: TriggerPost,
  allPosts: TriggerPost[],
): Promise<void> {
  const itemId = `shadow_${rootPost.conversationId}`;

  // 1. Add to queue as detected
  await queue.add({
    id: itemId,
    conversationId: rootPost.conversationId,
    triggerPost: rootPost,
    status: "detected",
    version: 1,
  });

  // 2. Classify
  const fullText = allPosts.map((p) => p.text).join("\n\n");
  const classification = classifyContent(fullText);
  await queue.setClassification(itemId, classification);

  if (classification.category === "other") {
    const reason = classification.skipReason ?? "Classified as 'other'.";
    await queue.updateStatus(itemId, "skipped", reason);
    await queue.setRenderedHtml(
      itemId,
      renderDegradedCard({
        status: "skipped",
        reason,
        triggerText: rootPost.text,
      }),
    );
    return;
  }

  // 3. Entity resolution — use root post only (not replies)
  await queue.updateStatus(itemId, "researching");
  const entity = resolveEntity(rootPost.text);
  await queue.setEntity(itemId, entity);

  if (!entity.ok) {
    const reason = entity.reviewReason ?? "Entity resolution failed.";
    await queue.updateStatus(itemId, "needs_review", reason);
    await queue.setRenderedHtml(
      itemId,
      renderDegradedCard({
        status: "needs_review",
        reason,
        triggerText: rootPost.text,
      }),
    );
    return;
  }

  if (entity.needsReview) {
    const reason = entity.reviewReason ?? "Entity needs manual review.";
    await queue.updateStatus(itemId, "needs_review", reason);
    await queue.setRenderedHtml(
      itemId,
      renderDegradedCard({
        company: entity.companyName,
        ticker: entity.ticker,
        status: "needs_review",
        reason,
        triggerText: rootPost.text,
      }),
    );
    return;
  }

  // 4. Evidence gate — use fixture filing data if available
  const fixtureData = FIXTURE_EVIDENCE_MAP[rootPost.conversationId];

  const evidence = fixtureData?.evidence ?? [
    {
      id: "E_AUTHOR",
      claim: fullText.slice(0, 200),
      source: "author_claim",
      date: rootPost.postedAt,
      confidence: "unverified" as const,
    },
  ];

  const metrics = fixtureData?.metrics ?? [];

  const gate = evidenceGate(evidence, metrics);
  await queue.setEvidenceGate(itemId, gate);

  if (!gate.allowed) {
    const reason = `Evidence gate blocked: ${gate.reason}`;
    await queue.updateStatus(itemId, "needs_review", reason);
    await queue.setRenderedHtml(
      itemId,
      renderDegradedCard({
        company: entity.companyName,
        ticker: entity.ticker,
        status: "needs_review",
        reason,
        triggerText: rootPost.text,
      }),
    );
    return;
  }

  // 5. Generate brief card
  if (fixtureData?.buildBrief) {
    const brief = fixtureData.buildBrief(rootPost);
    await queue.setBrief(itemId, brief);
    await queue.setRenderedHtml(itemId, renderBriefCard(brief));
  }

  await queue.updateStatus(itemId, "ready_for_review");
}

// ── Run all fixtures ─────────────────────────────────────────────────────────

/**
 * Run shadow-run with in-memory queue (default for tests).
 */
export async function runShadowRun(): Promise<ShadowRunResult> {
  const queue = new ReviewQueue();
  return runShadowRunWithQueue(queue);
}

/**
 * Run shadow-run with any queue implementation (in-memory or persistent).
 */
export async function runShadowRunWithQueue(
  queue: IReviewQueue,
): Promise<ShadowRunResult> {
  const adapter = new ReplayAdapter();

  // Fetch all root posts
  const rootPosts = await adapter.fetchRecentRootPosts({ maxResults: 10 });

  for (const root of rootPosts) {
    // Fetch full thread
    const thread = await adapter.fetchThread(root.conversationId);
    if (!thread.ok || !thread.rootPost) continue;

    const allPosts = [thread.rootPost, ...(thread.replies ?? [])];
    await processThread(queue, thread.rootPost, allPosts);
  }

  const items = await queue.getAll();
  const summary = {
    total: items.length,
    readyForReview: items.filter((i) => i.status === "ready_for_review").length,
    needsReview: items.filter((i) => i.status === "needs_review").length,
    skipped: items.filter((i) => i.status === "skipped").length,
    failed: items.filter((i) => i.status === "failed").length,
  };

  return { queue, items, summary };
}
