/**
 * AleaBit — Fake persistent queue for testing (#127)
 *
 * In-memory implementation that enforces the same idempotency contract
 * as PersistentReviewQueue: requires editHistory, deduplicates by
 * conversationId + editHistoryHash. No DB required.
 *
 * Used to prove runShadowRunWithQueue(persistentQueue) semantics:
 * first run 4 items, second run still 4 items.
 */

import { isValidAleabitTransition } from "@workspace/db/schema";

import { buildIdempotencyKey } from "../idempotency";

import type { IReviewQueue, QueueItem, AddQueueItem } from "../queue-interface";

export class FakePersistentQueue implements IReviewQueue {
  private items: Map<string, QueueItem> = new Map();
  private idempotencyIndex: Map<string, string> = new Map(); // key → itemId

  async add(params: AddQueueItem): Promise<QueueItem> {
    // Require editHistory for idempotency (same contract as PersistentReviewQueue)
    if (!params.editHistory || params.editHistory.length === 0) {
      throw new Error(
        `FakePersistentQueue.add requires editHistory for idempotency. ` +
          `Got conversationId=${params.conversationId} without editHistory.`,
      );
    }

    const key = buildIdempotencyKey(
      params.conversationId,
      params.editHistory,
      params.creatorId,
    );
    const idemKey = `${key.creatorId ?? ""}:${key.conversationId}:${key.editHistoryHash}`;

    // Idempotency: return existing item if same conversationId + editHistoryHash
    const existingId = this.idempotencyIndex.get(idemKey);
    if (existingId) {
      const existing = this.items.get(existingId);
      if (existing) return existing;
    }

    const now = new Date().toISOString();
    const item: QueueItem = {
      id: params.id,
      creatorId: params.creatorId ?? "aleabitoreddit",
      conversationId: params.conversationId,
      triggerPost: params.triggerPost,
      status: params.status,
      createdAt: now,
      updatedAt: now,
      version: params.version ?? 1,
    };

    this.items.set(item.id, item);
    this.idempotencyIndex.set(idemKey, item.id);
    return item;
  }

  async updateStatus(
    id: string,
    status: string,
    reason?: string,
  ): Promise<QueueItem | null> {
    const item = this.items.get(id);
    if (!item) return null;

    if (!isValidAleabitTransition(item.status as any, status as any)) {
      throw new Error(
        `Invalid transition: ${item.status} → ${status} for item ${id}`,
      );
    }

    item.status = status;
    item.updatedAt = new Date().toISOString();
    if (status === "skipped") item.skipReason = reason;
    if (status === "failed") item.failureReason = reason;
    return item;
  }

  async setBrief(id: string, brief: any): Promise<QueueItem | null> {
    const item = this.items.get(id);
    if (!item) return null;
    item.brief = brief;
    item.updatedAt = new Date().toISOString();
    return item;
  }

  async setRenderedHtml(id: string, html: string): Promise<QueueItem | null> {
    const item = this.items.get(id);
    if (!item) return null;
    item.renderedHtml = html;
    item.updatedAt = new Date().toISOString();
    return item;
  }

  async setClassification(
    id: string,
    classification: any,
  ): Promise<QueueItem | null> {
    const item = this.items.get(id);
    if (!item) return null;
    item.classification = classification;
    item.category = classification.category;
    item.updatedAt = new Date().toISOString();
    return item;
  }

  async setEntity(id: string, entity: any): Promise<QueueItem | null> {
    const item = this.items.get(id);
    if (!item) return null;
    item.entity = entity;
    item.updatedAt = new Date().toISOString();
    return item;
  }

  async setEvidenceGate(id: string, gate: any): Promise<QueueItem | null> {
    const item = this.items.get(id);
    if (!item) return null;
    item.evidenceGate = gate;
    item.updatedAt = new Date().toISOString();
    return item;
  }

  async get(id: string): Promise<QueueItem | undefined> {
    return this.items.get(id);
  }

  async getAll(): Promise<QueueItem[]> {
    return Array.from(this.items.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
}
