/**
 * AleaBit — Persistent review queue + audit log (#127)
 *
 * Queue items survive restarts. Idempotency key prevents duplicate items
 * from the same conversation+editHistory. Audit log records every status
 * transition with actor/timestamp/reason.
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { generateId } from "@workspace/shared/utils";

import { createInsertSchema, createSelectSchema } from "../lib/zod";

import type * as z from "zod";

// ─── AleaBit review queue ────────────────────────────────────────────────────

/**
 * Processing status for queue items.
 * Mirrors BriefStatus from shared types, with two human review states added.
 */
export type AleabitQueueStatus =
  | "detected"
  | "researching"
  | "ready_for_review"
  | "needs_review"
  | "skipped"
  | "failed"
  | "approved"
  | "rejected"
  | "needs_more_evidence"
  | "archived";

/**
 * Valid status transitions.
 * Machine states flow downward; human review states are terminal branches.
 */
const VALID_TRANSITIONS: Record<AleabitQueueStatus, AleabitQueueStatus[]> = {
  detected: ["researching", "skipped", "failed"],
  researching: ["ready_for_review", "needs_review", "skipped", "failed"],
  ready_for_review: ["approved", "rejected", "needs_more_evidence", "archived"],
  needs_review: ["approved", "rejected", "needs_more_evidence", "archived"],
  skipped: ["archived"],
  failed: ["archived"],
  approved: ["archived"], // approved can still be archived
  rejected: ["archived"],
  needs_more_evidence: ["ready_for_review", "archived"], // can re-enter review
  archived: [], // terminal
};

export function isValidAleabitTransition(
  from: AleabitQueueStatus,
  to: AleabitQueueStatus,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export const aleabitQueue = pgTable(
  "aleabit_queue",
  {
    id: text().primaryKey().$defaultFn(generateId),

    // Multi-creator idempotency
    creatorId: text("creator_id").notNull().default("aleabitoreddit"),

    // Idempotency: creatorId + conversationId + editHistoryHash is unique
    conversationId: text().notNull(),
    editHistoryHash: text().notNull(),

    // Trigger post snapshot
    triggerPost: jsonb().notNull(), // TriggerPost JSON

    // Pipeline state (null until populated)
    category: text(), // ContentCategory
    classification: jsonb(), // ClassificationResult JSON
    entity: jsonb(), // EntityResolution JSON
    evidenceGate: jsonb(), // EvidenceGateResult JSON
    brief: jsonb(), // FinancialBriefCard JSON
    renderedHtml: text(),
    renderedArtifactHash: text(), // sha256 of renderedHtml for dedup
    renderedPngHashZh: text(), // sha256 of zh-CN PNG for dedup
    renderedPngHashEn: text(), // sha256 of en PNG for dedup
    policyDecision: jsonb(), // PolicyDecision JSON

    // Status
    status: text().notNull().default("detected"),
    skipReason: text(),
    failureReason: text(),

    // Versioning
    version: text().notNull().default("1"),

    // Timestamps
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp()
      .notNull()
      .$onUpdate(() => new Date())
      .defaultNow(),
  },
  (table) => [
    // Idempotency: same creator + same conversation + same edit history = one item
    uniqueIndex("aleabit_queue_idempotency_idx").on(
      table.creatorId,
      table.conversationId,
      table.editHistoryHash,
    ),
    index("aleabit_queue_status_idx").on(table.status),
    index("aleabit_queue_conversationId_idx").on(table.conversationId),
    index("aleabit_queue_createdAt_idx").on(table.createdAt),
  ],
);

// ─── Audit log ───────────────────────────────────────────────────────────────

/**
 * Every status change is recorded. Immutable append-only log.
 */
export const aleabitAuditLog = pgTable(
  "aleabit_audit_log",
  {
    id: text().primaryKey().$defaultFn(generateId),
    itemId: text().notNull(), // references aleabit_queue.id

    // Transition
    fromStatus: text().notNull(),
    toStatus: text().notNull(),
    reason: text(),

    // Actor
    actorId: text(), // user id or "system" for automated transitions
    actorType: text().notNull().default("system"), // "system" | "human"

    // Timestamp
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    index("aleabit_audit_log_itemId_idx").on(table.itemId),
    index("aleabit_audit_log_createdAt_idx").on(table.createdAt),
    index("aleabit_audit_log_toStatus_idx").on(table.toStatus),
  ],
);

// ─── Zod schemas ─────────────────────────────────────────────────────────────

export const insertAleabitQueueSchema = createInsertSchema(aleabitQueue);
export const selectAleabitQueueSchema = createSelectSchema(aleabitQueue);
export const insertAleabitAuditLogSchema = createInsertSchema(aleabitAuditLog);
export const selectAleabitAuditLogSchema = createSelectSchema(aleabitAuditLog);

export type InsertAleabitQueue = z.infer<typeof insertAleabitQueueSchema>;
export type SelectAleabitQueue = z.infer<typeof selectAleabitQueueSchema>;
export type InsertAleabitAuditLog = z.infer<typeof insertAleabitAuditLogSchema>;
export type SelectAleabitAuditLog = z.infer<typeof selectAleabitAuditLogSchema>;

// ─── Publish attempts audit (#141) ─────────────────────────────────────────────

/**
 * Every publish attempt (dry-run or real) is recorded.
 * Immutable append-only log for audit trail.
 */
export const aleabitPublishAttempts = pgTable(
  "aleabit_publish_attempts",
  {
    id: text().primaryKey(),
    queueItemId: text("queue_item_id").notNull(),
    creatorId: text("creator_id").notNull(),
    conversationId: text("conversation_id").notNull(),
    sourcePostId: text("source_post_id").notNull(),
    policyVersion: integer("policy_version").notNull(),
    rolloutMode: text("rollout_mode").notNull(),
    dryRun: boolean("dry_run").notNull().default(true),
    adapter: text().notNull(),
    payloadHash: text("payload_hash").notNull(),
    imageHashZh: text("image_hash_zh").notNull(),
    imageHashEn: text("image_hash_en").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    decision: text().notNull(),
    failureStage: text("failure_stage"),
    externalPostId: text("external_post_id"),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_publish_attempts_queue_item").on(table.queueItemId),
    index("idx_publish_attempts_idempotency").on(table.idempotencyKey),
    index("idx_publish_attempts_creator").on(table.creatorId),
    // DB-level guard: one successful live publish per idempotency key.
    // Partial unique index — dry-run/blocked/duplicate rows are excluded.
    uniqueIndex("idx_publish_attempts_idempotency_live")
      .on(table.idempotencyKey)
      .where(
        sql`dry_run = false AND decision = 'attempted' AND external_post_id IS NOT NULL`,
      ),
  ],
);

export const insertAleabitPublishAttemptSchema = createInsertSchema(
  aleabitPublishAttempts,
);
export const selectAleabitPublishAttemptSchema = createSelectSchema(
  aleabitPublishAttempts,
);
export type InsertAleabitPublishAttempt = z.infer<
  typeof insertAleabitPublishAttemptSchema
>;
export type SelectAleabitPublishAttempt = z.infer<
  typeof selectAleabitPublishAttemptSchema
>;
