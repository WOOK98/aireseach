/**
 * Research Notes — first-class saved research documents (#154)
 *
 * Turns the one-shot article generator output (#116) into a durable
 * workspace object: saveable, reopenable, evidence chain intact.
 *
 * Core invariants:
 * - artifact is IMMUTABLE after insert (as_of snapshot semantics).
 *   Only title / summary / note / tags may be edited afterwards.
 * - user-scoped: no cross-user reads, no public sharing default.
 * - evidence chain: evidenceIds + asOf preserved verbatim from the
 *   generated article so old research stays reproducible.
 */

import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { generateId } from "@workspace/shared/utils";

import { createInsertSchema, createSelectSchema } from "../lib/zod";
import { user } from "./auth";

import type { LiveBlock } from "@workspace/shared/schema/live-block";
import type { NoteBlock } from "@workspace/shared/schema/note-block";
import type * as z from "zod";

export const researchNotes = pgTable(
  "research_notes",
  {
    id: text().primaryKey().$defaultFn(generateId),

    // Owner — user-scoped from day one, no public default
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // ── Editable fields (the ONLY fields PATCH may touch) ──
    title: text().notNull(),
    summary: text(),
    note: text(),
    tags: jsonb().$type<string[]>().notNull().default([]),

    // ── Entity / classification (extracted at save time) ──
    entityTicker: text("entity_ticker"),
    entityName: text("entity_name"),

    // ── Immutable artifact (as_of snapshot) ──
    // "article" = LLM-generated ResearchArticle (#116); "draft" = converted
    // from an Evidence Inbox item (#165). Both are immutable after insert.
    kind: text().notNull().default("article"),
    artifact: jsonb().notNull(), // noteArtifactSchema JSON — never updated
    schemaVersion: integer("schema_version").notNull(),
    evidenceIds: jsonb().$type<string[]>().notNull().default([]),
    asOf: text("as_of").notNull(), // entity.dataTimestamp, verbatim
    sourceMeta: jsonb(), // { query, language } — provenance

    // ── Live Blocks (#167) — refreshable evidence blocks ──
    // Separate column on purpose: the artifact stays an immutable as-of
    // snapshot (#154 redline); refresh only ever rewrites this array.
    liveBlocks: jsonb("live_blocks").$type<LiveBlock[]>().notNull().default([]),

    // ── Doc Blocks (#188) — user-authored document canvas blocks ──
    // Separate column on purpose: doc blocks are user narrative, NOT the
    // immutable artifact and NOT refresh-managed live blocks.
    docBlocks: jsonb("doc_blocks").$type<NoteBlock[]>().notNull().default([]),

    // ── Timestamps ──
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date())
      .defaultNow(),
  },
  (table) => [
    index("research_notes_user_created_idx").on(table.userId, table.createdAt),
    index("research_notes_user_ticker_idx").on(
      table.userId,
      table.entityTicker,
    ),
  ],
);

// ─── Zod schemas ─────────────────────────────────────────────────────────────

export const insertResearchNoteSchema = createInsertSchema(researchNotes);
export const selectResearchNoteSchema = createSelectSchema(researchNotes);

export type InsertResearchNote = z.infer<typeof insertResearchNoteSchema>;
export type SelectResearchNote = z.infer<typeof selectResearchNoteSchema>;
