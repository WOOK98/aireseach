/**
 * Evidence Inbox — user-captured research material (#165, #152 knife-3)
 *
 * Manual capture counterpart to the AleaBit machine pipeline: pasted text,
 * bookmarked URLs, and X post links become first-class source records that
 * convert into draft research notes.
 *
 * Core invariants:
 * - user-scoped: no cross-user reads, no public sharing default.
 * - evidence model reuse: conversion builds #117 EvidenceRef objects; this
 *   table stores provenance, NOT a second evidence schema.
 * - idempotency: userId + url is unique for url-typed items (partial index);
 *   convert is idempotent (re-convert returns the existing noteId).
 * - boundary vs aleabit_queue: that table is the machine pipeline (creators,
 *   gates, publish review); this one is the user's manual capture tray.
 */

import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { generateId } from "@workspace/shared/utils";

import { createInsertSchema, createSelectSchema } from "../lib/zod";
import { user } from "./auth";
import { researchNotes } from "./research-notes";

import type * as z from "zod";

export const EVIDENCE_INBOX_SOURCE_TYPES = ["url", "paste", "x_post"] as const;
export type EvidenceInboxSourceType =
  (typeof EVIDENCE_INBOX_SOURCE_TYPES)[number];

export const EVIDENCE_INBOX_STATUSES = [
  "inbox",
  "converted",
  "archived",
] as const;
export type EvidenceInboxStatus = (typeof EVIDENCE_INBOX_STATUSES)[number];

export const evidenceInbox = pgTable(
  "evidence_inbox",
  {
    id: text().primaryKey().$defaultFn(generateId),

    // Owner — user-scoped from day one, no public default
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // ── Source provenance ──
    sourceType: text("source_type").notNull(), // url | paste | x_post
    title: text().notNull(),
    url: text(),
    author: text(),
    publishedAt: text("published_at"), // ISO date/datetime string, user-supplied
    rawText: text("raw_text"), // pasted body (paste type); capped at API layer

    // ── Lifecycle ──
    status: text().notNull().default("inbox"), // inbox | converted | archived
    noteId: text("note_id").references(() => researchNotes.id, {
      onDelete: "set null",
    }),

    // ── Timestamps ──
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date())
      .defaultNow(),
  },
  (table) => [
    index("evidence_inbox_user_created_idx").on(table.userId, table.createdAt),
    index("evidence_inbox_user_status_idx").on(table.userId, table.status),
    // Idempotency for url-typed items; paste items are never deduped.
    uniqueIndex("evidence_inbox_user_url_uniq")
      .on(table.userId, table.url)
      .where(sql`url is not null`),
  ],
);

// ─── Zod schemas ─────────────────────────────────────────────────────────────

export const insertEvidenceInboxSchema = createInsertSchema(evidenceInbox);
export const selectEvidenceInboxSchema = createSelectSchema(evidenceInbox);

export type InsertEvidenceInbox = z.infer<typeof insertEvidenceInboxSchema>;
export type SelectEvidenceInbox = z.infer<typeof selectEvidenceInboxSchema>;
