/**
 * AleaBit — Persistent review queue (PostgreSQL) (#127)
 *
 * Drop-in replacement for the in-memory ReviewQueue.
 * Uses conversationId + editHistoryHash as idempotency key.
 * Every status transition is recorded in the audit log.
 *
 * Shadow-run replay can write to the same queue without creating
 * duplicate items — idempotency key handles dedup.
 */

import { and, desc, eq } from "drizzle-orm";

import {
  aleabitAuditLog,
  aleabitQueue,
  isValidAleabitTransition,
} from "@workspace/db/schema";
import { db } from "@workspace/db/server";

import { buildIdempotencyKey } from "./idempotency";

import type { EvidenceGateResult } from "./gates/evidence";
import type {
  BriefStatus,
  ContentCategory,
  EntityResolution,
  FinancialBriefCard,
  TriggerPost,
} from "@workspace/shared/types/aleabit";
import type { ClassificationResult } from "@workspace/shared/types/aleabit";

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Human review status — extends BriefStatus with manual dispositions.
 */
export type HumanReviewStatus =
  | "approved"
  | "rejected"
  | "needs_more_evidence"
  | "archived";

export type QueueStatus = BriefStatus | HumanReviewStatus;

export interface QueueItem {
  id: string;
  conversationId: string;
  editHistoryHash: string;
  triggerPost: TriggerPost;
  status: QueueStatus;
  category?: ContentCategory;
  classification?: ClassificationResult;
  entity?: EntityResolution;
  evidenceGate?: EvidenceGateResult;
  brief?: FinancialBriefCard;
  renderedHtml?: string;
  renderedArtifactHash?: string;
  skipReason?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface AuditEntry {
  id: string;
  itemId: string;
  fromStatus: string;
  toStatus: string;
  reason?: string;
  actorId?: string;
  actorType: "system" | "human";
  createdAt: string;
}

// ── Persistent queue ─────────────────────────────────────────────────────────

export class PersistentReviewQueue {
  /**
   * Add a new item. If an item with the same conversationId + editHistoryHash
   * already exists, returns the existing item (idempotent).
   */
  async add(params: {
    id: string;
    creatorId?: string;
    conversationId: string;
    editHistory: string[];
    triggerPost: TriggerPost;
    status: BriefStatus;
    version?: number;
  }): Promise<QueueItem> {
    const key = buildIdempotencyKey(
      params.conversationId,
      params.editHistory,
      params.creatorId,
    );

    // Check for existing item
    const existing = await db
      .select()
      .from(aleabitQueue)
      .where(
        and(
          eq(aleabitQueue.conversationId, params.conversationId),
          eq(aleabitQueue.editHistoryHash, key.editHistoryHash),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return this.rowToItem(existing[0]!);
    }

    const rows = await db
      .insert(aleabitQueue)
      .values({
        id: params.id,
        conversationId: params.conversationId,
        editHistoryHash: key.editHistoryHash,
        triggerPost: params.triggerPost,
        status: params.status,
        version: String(params.version ?? 1),
      })
      .returning();

    return this.rowToItem(rows[0]!);
  }

  /**
   * Update status with transition validation.
   * Records audit log entry for every transition.
   */
  async updateStatus(
    id: string,
    status: QueueStatus,
    reason?: string,
    actorId?: string,
    actorType: "system" | "human" = "system",
  ): Promise<QueueItem | null> {
    const item = await this.get(id);
    if (!item) return null;

    if (!isValidAleabitTransition(item.status as any, status as any)) {
      throw new Error(
        `Invalid transition: ${item.status} → ${status} for item ${id}`,
      );
    }

    const rows = await db
      .update(aleabitQueue)
      .set({
        status,
        skipReason: status === "skipped" ? reason : undefined,
        failureReason: status === "failed" ? reason : undefined,
        updatedAt: new Date(),
      })
      .where(eq(aleabitQueue.id, id))
      .returning();

    // Audit log
    await this.recordAudit(id, item.status, status, reason, actorId, actorType);

    return this.rowToItem(rows[0]!);
  }

  /**
   * Set structured brief on an item.
   */
  async setBrief(
    id: string,
    brief: FinancialBriefCard,
  ): Promise<QueueItem | null> {
    const rows = await db
      .update(aleabitQueue)
      .set({ brief, updatedAt: new Date() })
      .where(eq(aleabitQueue.id, id))
      .returning();

    return rows[0] ? this.rowToItem(rows[0]) : null;
  }

  /**
   * Set rendered HTML + hash for artifact dedup.
   */
  async setRenderedHtml(id: string, html: string): Promise<QueueItem | null> {
    const hash = await this.hashContent(html);
    const rows = await db
      .update(aleabitQueue)
      .set({
        renderedHtml: html,
        renderedArtifactHash: hash,
        updatedAt: new Date(),
      })
      .where(eq(aleabitQueue.id, id))
      .returning();

    return rows[0] ? this.rowToItem(rows[0]) : null;
  }

  /**
   * Set classification result.
   */
  async setClassification(
    id: string,
    classification: ClassificationResult,
  ): Promise<QueueItem | null> {
    const rows = await db
      .update(aleabitQueue)
      .set({
        classification,
        category: classification.category,
        updatedAt: new Date(),
      })
      .where(eq(aleabitQueue.id, id))
      .returning();

    return rows[0] ? this.rowToItem(rows[0]) : null;
  }

  /**
   * Set entity resolution.
   */
  async setEntity(
    id: string,
    entity: EntityResolution,
  ): Promise<QueueItem | null> {
    const rows = await db
      .update(aleabitQueue)
      .set({ entity, updatedAt: new Date() })
      .where(eq(aleabitQueue.id, id))
      .returning();

    return rows[0] ? this.rowToItem(rows[0]) : null;
  }

  /**
   * Set evidence gate result.
   */
  async setEvidenceGate(
    id: string,
    gate: EvidenceGateResult,
  ): Promise<QueueItem | null> {
    const rows = await db
      .update(aleabitQueue)
      .set({ evidenceGate: gate, updatedAt: new Date() })
      .where(eq(aleabitQueue.id, id))
      .returning();

    return rows[0] ? this.rowToItem(rows[0]) : null;
  }

  /**
   * Get single item by id.
   */
  async get(id: string): Promise<QueueItem | undefined> {
    const rows = await db
      .select()
      .from(aleabitQueue)
      .where(eq(aleabitQueue.id, id))
      .limit(1);

    return rows.length > 0 ? this.rowToItem(rows[0]!) : undefined;
  }

  /**
   * Get item by idempotency key (conversationId + editHistory).
   */
  async getByIdempotencyKey(
    conversationId: string,
    editHistory: string[],
  ): Promise<QueueItem | undefined> {
    const key = buildIdempotencyKey(conversationId, editHistory);
    const rows = await db
      .select()
      .from(aleabitQueue)
      .where(
        and(
          eq(aleabitQueue.conversationId, conversationId),
          eq(aleabitQueue.editHistoryHash, key.editHistoryHash),
        ),
      )
      .limit(1);

    return rows.length > 0 ? this.rowToItem(rows[0]!) : undefined;
  }

  /**
   * Get all items, newest first.
   */
  async getAll(): Promise<QueueItem[]> {
    const rows = await db
      .select()
      .from(aleabitQueue)
      .orderBy(desc(aleabitQueue.createdAt));

    return rows.map((r) => this.rowToItem(r));
  }

  /**
   * Get items by status.
   */
  async getByStatus(status: QueueStatus): Promise<QueueItem[]> {
    const rows = await db
      .select()
      .from(aleabitQueue)
      .where(eq(aleabitQueue.status, status))
      .orderBy(desc(aleabitQueue.createdAt));

    return rows.map((r) => this.rowToItem(r));
  }

  /**
   * Get audit log for an item.
   */
  async getAuditLog(itemId: string): Promise<AuditEntry[]> {
    const rows = await db
      .select()
      .from(aleabitAuditLog)
      .where(eq(aleabitAuditLog.itemId, itemId))
      .orderBy(desc(aleabitAuditLog.createdAt));

    return rows.map((r) => ({
      id: r.id,
      itemId: r.itemId,
      fromStatus: r.fromStatus,
      toStatus: r.toStatus,
      reason: r.reason ?? undefined,
      actorId: r.actorId ?? undefined,
      actorType: (r.actorType as "system" | "human") ?? "system",
      createdAt: r.createdAt.toISOString(),
    }));
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private async recordAudit(
    itemId: string,
    fromStatus: string,
    toStatus: string,
    reason?: string,
    actorId?: string,
    actorType: "system" | "human" = "system",
  ): Promise<void> {
    await db.insert(aleabitAuditLog).values({
      itemId,
      fromStatus,
      toStatus,
      reason: reason ?? null,
      actorId: actorId ?? null,
      actorType,
    });
  }

  private async hashContent(content: string): Promise<string> {
    const data = new TextEncoder().encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  private rowToItem(row: typeof aleabitQueue.$inferSelect): QueueItem {
    return {
      id: row.id,
      conversationId: row.conversationId,
      editHistoryHash: row.editHistoryHash,
      triggerPost: row.triggerPost as TriggerPost,
      status: row.status as QueueStatus,
      category: (row.category as ContentCategory) ?? undefined,
      classification: (row.classification as ClassificationResult) ?? undefined,
      entity: (row.entity as EntityResolution) ?? undefined,
      evidenceGate: (row.evidenceGate as EvidenceGateResult) ?? undefined,
      brief: (row.brief as FinancialBriefCard) ?? undefined,
      renderedHtml: row.renderedHtml ?? undefined,
      renderedArtifactHash: row.renderedArtifactHash ?? undefined,
      skipReason: row.skipReason ?? undefined,
      failureReason: row.failureReason ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      version: parseInt(row.version, 10),
    };
  }
}
