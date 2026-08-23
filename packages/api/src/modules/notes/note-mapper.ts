import { z } from "zod";

/**
 * Research Notes — pure helpers (#154)
 *
 * Extraction + sanitization logic, kept DB-free for unit testing.
 *
 * INVARIANTS:
 * - artifact / schemaVersion / evidenceIds / asOf / entity* are set once at
 *   save time and can never be patched (as_of snapshot semantics).
 * - Only title / summary / note / tags are editable.
 */
import { researchArticleSchema } from "@workspace/shared/schema/article";
import { sanitizeLiveBlocks } from "@workspace/shared/schema/live-block";

import type { ResearchArticle } from "@workspace/shared/types/article";

// ── Input schemas ────────────────────────────────────────────────────────────

export const createNoteInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(2000).nullish(),
  note: z.string().trim().max(10000).nullish(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).nullish(),
  article: z.unknown(), // validated against researchArticleSchema below
  sourceMeta: z
    .object({
      query: z.string().trim().max(200).optional(),
      language: z.enum(["zh", "en"]).optional(),
    })
    .nullish(),
});

export const patchNoteInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    summary: z.string().trim().max(2000).nullable().optional(),
    note: z.string().trim().max(10000).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  })
  .strict(); // strips nothing, rejects unknown keys (artifact immutability)

export const listNotesQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  ticker: z.string().trim().max(24).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateNoteInput = z.infer<typeof createNoteInputSchema>;
export type PatchNoteInput = z.infer<typeof patchNoteInputSchema>;
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;

// ── Article validation + extraction ─────────────────────────────────────────

export interface ValidatedArticleFields {
  artifact: ResearchArticle;
  schemaVersion: number;
  evidenceIds: string[];
  asOf: string;
  entityTicker: string | null;
  entityName: string;
}

/**
 * Validate an unknown payload against the article schema and extract the
 * note fields. Returns null when the payload is not a valid ResearchArticle
 * (caller maps this to a neutral 422).
 */
export function extractArticleFields(
  payload: unknown,
): ValidatedArticleFields | null {
  const parsed = researchArticleSchema.safeParse(payload);
  if (!parsed.success) return null;

  const article = parsed.data as ResearchArticle;
  return {
    artifact: article,
    schemaVersion: article.schema_version,
    evidenceIds: article.evidence.map((e) => e.id),
    asOf: article.entity.dataTimestamp,
    entityTicker: article.entity.ticker ?? null,
    entityName: article.entity.resolvedName,
  };
}

// ── Response mappers ─────────────────────────────────────────────────────────

interface NoteRow {
  id: string;
  title: string;
  summary: string | null;
  note: string | null;
  tags: string[];
  /** "article" = LLM-generated (#154); "draft" = converted inbox item (#165). */
  kind: string;
  entityTicker: string | null;
  entityName: string | null;
  artifact: unknown;
  schemaVersion: number;
  evidenceIds: string[];
  /** Live Blocks column (#167) — optional at the mapper boundary: old rows
   *  and fixtures may lack it; sanitizeLiveBlocks degrades to []. */
  liveBlocks?: unknown;
  asOf: string;
  sourceMeta: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const iso = (d: Date | string) =>
  d instanceof Date ? d.toISOString() : new Date(d).toISOString();

/** List view: everything EXCEPT the artifact payload (kept light). */
export function toNoteListItem(row: NoteRow) {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    note: row.note,
    tags: row.tags,
    kind: row.kind,
    entityTicker: row.entityTicker,
    entityName: row.entityName,
    schemaVersion: row.schemaVersion,
    evidenceCount: row.evidenceIds.length,
    asOf: row.asOf,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

/** Detail view: full artifact for the ArticleReport renderer. */
export function toNoteDetail(row: NoteRow) {
  return {
    ...toNoteListItem(row),
    artifact: row.artifact,
    evidenceIds: row.evidenceIds,
    // Tolerant read: malformed blocks are dropped, never 500 the page.
    liveBlocks: sanitizeLiveBlocks(row.liveBlocks),
    sourceMeta: row.sourceMeta,
  };
}
