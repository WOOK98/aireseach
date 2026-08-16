/**
 * AleaBit — Persistent review queue + audit log (#127)
 *
 * Queue items survive restarts. Idempotency key prevents duplicate items
 * from the same conversation+editHistory. Audit log records every status
 * transition with actor/timestamp/reason.
 */

import {
  index,
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
