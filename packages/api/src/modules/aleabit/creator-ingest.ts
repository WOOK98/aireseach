/**
 * AleaBit — Multi-creator ingest runner (#130)
 *
 * Processes multiple creator sources through the full pipeline:
 * creator config → fetch → thread merge → classification →
 * entity gate → evidence gate → persistent queue
 *
 * Supports shadow (replay fixtures) and live (API) modes.
 * NEVER publishes, replies, quotes, or uploads media.
 */

import { classifyContent } from "./gates/classify";
import { resolveEntity } from "./gates/entity";
import { evidenceGate } from "./gates/evidence";
import { renderDegradedCard } from "./renderer";

import type { CreatorSourceAdapter } from "./creator-adapter";
import type { CreatorSourceConfig } from "./creator-config";
import type { IReviewQueue, QueueItem } from "./queue-interface";
import type { TriggerPost } from "@workspace/shared/types/aleabit";

// ── Ingest result ────────────────────────────────────────────────────────────

export interface CreatorIngestSummary {
  creatorId: string;
  handle: string;
  fetched: number;
  classified: number;
  skipped: number;
  needsReview: number;
  readyForReview: number;
  duplicates: number;
  failed: number;
}

export interface MultiCreatorIngestResult {
  queue: IReviewQueue;
  items: QueueItem[];
  summaries: CreatorIngestSummary[];
  totalSummary: {
    fetched: number;
    classified: number;
    skipped: number;
    needsReview: number;
    readyForReview: number;
    duplicates: number;
    failed: number;
  };
}

// ── Process single thread for a creator ──────────────────────────────────────

async function processCreatorThread(
  queue: IReviewQueue,
  config: CreatorSourceConfig,
  rootPost: TriggerPost,
  allPosts: TriggerPost[],
): Promise<{ status: string; isDuplicate: boolean }> {
  // Prefix with creator id for cross-creator idempotency
  const itemId = `creator_${config.id}_${rootPost.conversationId}`;

  // 1. Add to queue
  const addedItem = await queue.add({
    id: itemId,
    creatorId: config.id,
    conversationId: rootPost.conversationId,
    triggerPost: rootPost,
    editHistory: rootPost.editHistory,
    status: "detected",
    version: 1,
  });

  // Check for duplicate (terminal state = already processed)
  const terminalStatuses = [
    "ready_for_review",
    "needs_review",
    "skipped",
    "failed",
    "approved",
    "rejected",
    "archived",
  ];
  if (terminalStatuses.includes(addedItem.status)) {
    return { status: addedItem.status, isDuplicate: true };
  }

  // 2. Classify — merge all posts in thread
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
    return { status: "skipped", isDuplicate: false };
  }

  // 3. Entity resolution — root post only
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
    return { status: "needs_review", isDuplicate: false };
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
    return { status: "needs_review", isDuplicate: false };
  }

  // 4. Evidence gate — author_claim only (no fixture filing data for live ingest)
  const evidence = [
    {
      id: "E_AUTHOR",
      claim: fullText.slice(0, 200),
      source: "author_claim",
      date: rootPost.postedAt,
      confidence: "unverified" as const,
    },
  ];

  const gate = evidenceGate(evidence, []);
  await queue.setEvidenceGate(itemId, gate);

  // Evidence gate always blocks without filing data → needs_review
  // This is correct behavior: creator posts are triggers, not facts
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
    return { status: "needs_review", isDuplicate: false };
  }

  // If somehow evidence passes (e.g., fixture data), mark ready
  await queue.updateStatus(itemId, "ready_for_review");
  return { status: "ready_for_review", isDuplicate: false };
}

// ── Run ingest for a single creator ──────────────────────────────────────────

async function ingestCreator(
  queue: IReviewQueue,
  adapter: CreatorSourceAdapter,
  options: { maxResults: number },
): Promise<CreatorIngestSummary> {
  const config = adapter.config;
  const summary: CreatorIngestSummary = {
    creatorId: config.id,
    handle: config.handle,
    fetched: 0,
    classified: 0,
    skipped: 0,
    needsReview: 0,
    readyForReview: 0,
    duplicates: 0,
    failed: 0,
  };

  const rootPosts = await adapter.fetchRecentRootPosts({
    maxResults: options.maxResults,
  });
  summary.fetched = rootPosts.length;

  for (const root of rootPosts) {
    try {
      const thread = await adapter.fetchThread(root.conversationId);
      if (!thread.ok || !thread.rootPost) {
        summary.failed++;
        continue;
      }

      const allPosts = [thread.rootPost, ...(thread.replies ?? [])];
      const result = await processCreatorThread(
        queue,
        config,
        thread.rootPost,
        allPosts,
      );

      if (result.isDuplicate) {
        summary.duplicates++;
      } else {
        summary.classified++;
        switch (result.status) {
          case "skipped":
            summary.skipped++;
            break;
          case "needs_review":
            summary.needsReview++;
            break;
          case "ready_for_review":
            summary.readyForReview++;
            break;
          case "failed":
            summary.failed++;
            break;
        }
      }
    } catch {
      summary.failed++;
    }
  }

  return summary;
}

// ── Multi-creator ingest ─────────────────────────────────────────────────────

/**
 * Run ingest for multiple creator adapters.
 *
 * @param queue - Queue implementation (in-memory or persistent)
 * @param adapters - Creator source adapters to ingest from
 * @param options - maxResults per creator
 */
export async function runMultiCreatorIngest(
  queue: IReviewQueue,
  adapters: CreatorSourceAdapter[],
  options: { maxResultsPerCreator: number } = { maxResultsPerCreator: 10 },
): Promise<MultiCreatorIngestResult> {
  const summaries: CreatorIngestSummary[] = [];

  for (const adapter of adapters) {
    if (!adapter.config.enabled) continue;
    const summary = await ingestCreator(queue, adapter, {
      maxResults: options.maxResultsPerCreator,
    });
    summaries.push(summary);
  }

  const items = await queue.getAll();

  const totalSummary = {
    fetched: summaries.reduce((s, c) => s + c.fetched, 0),
    classified: summaries.reduce((s, c) => s + c.classified, 0),
    skipped: summaries.reduce((s, c) => s + c.skipped, 0),
    needsReview: summaries.reduce((s, c) => s + c.needsReview, 0),
    readyForReview: summaries.reduce((s, c) => s + c.readyForReview, 0),
    duplicates: summaries.reduce((s, c) => s + c.duplicates, 0),
    failed: summaries.reduce((s, c) => s + c.failed, 0),
  };

  return { queue, items, summaries, totalSummary };
}
