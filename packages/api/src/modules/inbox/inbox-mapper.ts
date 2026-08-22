import { z } from "zod";

/**
 * Evidence Inbox — pure helpers (#165)
 *
 * Validation + conversion logic, kept DB-free for unit testing.
 *
 * INVARIANTS:
 * - convert output reuses #117 evidenceRefSchema / draftNoteArtifactSchema —
 *   no second evidence model.
 * - evidence id is deterministic (`inbox:<itemId>`) so re-convert after a
 *   partial failure cannot create duplicate refs.
 * - fail-closed: url-typed items REQUIRE a url; paste items REQUIRE rawText.
 */
import {
  DRAFT_NOTE_SCHEMA_VERSION,
  draftNoteArtifactSchema,
  evidenceRefSchema,
} from "@workspace/shared/schema/article";

import type { DraftNoteArtifact } from "@workspace/shared/schema/article";
import type { EvidenceRef } from "@workspace/shared/types/article";

// ── Input schemas ────────────────────────────────────────────────────────────

const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;

export const createInboxItemInputSchema = z
  .object({
    sourceType: z.enum(["url", "paste", "x_post"]),
    title: z.string().trim().min(1).max(200),
    url: z.string().trim().url().max(2000).nullish(),
    author: z.string().trim().min(1).max(120).nullish(),
    publishedAt: z.string().trim().regex(ISO_DATE_RE).max(40).nullish(),
    rawText: z.string().trim().min(1).max(50000).nullish(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.sourceType !== "paste" && !data.url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "url is required for url/x_post source types.",
        path: ["url"],
      });
    }
    if (data.sourceType === "paste" && !data.rawText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rawText is required for paste source type.",
        path: ["rawText"],
      });
    }
  });

export const patchInboxItemInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    author: z.string().trim().min(1).max(120).nullable().optional(),
    publishedAt: z
      .string()
      .trim()
      .regex(ISO_DATE_RE)
      .max(40)
      .nullable()
      .optional(),
    rawText: z.string().trim().min(1).max(50000).nullable().optional(),
    status: z.literal("archived").optional(),
  })
  .strict(); // rejects unknown keys; status can only move to archived via PATCH

export const listInboxQuerySchema = z.object({
  status: z.enum(["inbox", "converted", "archived"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateInboxItemInput = z.infer<typeof createInboxItemInputSchema>;
export type PatchInboxItemInput = z.infer<typeof patchInboxItemInputSchema>;
export type ListInboxQuery = z.infer<typeof listInboxQuerySchema>;

// ── Convert helpers ──────────────────────────────────────────────────────────

export interface InboxRowLike {
  id: string;
  sourceType: string;
  title: string;
  url: string | null;
  author: string | null;
  publishedAt: string | null;
  rawText: string | null;
  status: string;
  noteId: string | null;
  createdAt: Date | string;
}

/** Deterministic evidence id — re-convert can never duplicate a ref. */
export function evidenceIdForItem(itemId: string): string {
  return `inbox:${itemId}`;
}

const iso = (d: Date | string) =>
  d instanceof Date ? d.toISOString() : new Date(d).toISOString();

/** Host label for source attribution when no author is given. */
export function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/**
 * Build the EvidenceRef for an inbox item. Result passes #117
 * evidenceRefSchema; throws when it would not (should never happen for a
 * row that passed create validation).
 */
export function buildEvidenceRef(item: InboxRowLike): EvidenceRef {
  const capturedAt = iso(item.createdAt);
  const ref = {
    id: evidenceIdForItem(item.id),
    claim: item.title,
    source:
      item.author ??
      hostOf(item.url) ??
      (item.sourceType === "x_post" ? "X post" : "手动粘贴"),
    date: item.publishedAt ?? capturedAt,
    ...(item.url ? { url: item.url } : {}),
    confidence: "unverified",
  };
  return evidenceRefSchema.parse(ref);
}

/**
 * Build the immutable draft artifact for a converted inbox item.
 * Validated against draftNoteArtifactSchema before returning.
 */
export function buildDraftArtifact(item: InboxRowLike): DraftNoteArtifact {
  const artifact = {
    kind: "draft",
    schema_version: DRAFT_NOTE_SCHEMA_VERSION,
    evidence: [buildEvidenceRef(item)],
    source: {
      inboxItemId: item.id,
      sourceType: item.sourceType,
      title: item.title,
      ...(item.url ? { url: item.url } : {}),
      ...(item.author ? { author: item.author } : {}),
      ...(item.publishedAt ? { publishedAt: item.publishedAt } : {}),
      ...(item.rawText ? { rawText: item.rawText } : {}),
    },
    capturedAt: iso(item.createdAt),
  };
  return draftNoteArtifactSchema.parse(artifact);
}

// ── Response mappers ─────────────────────────────────────────────────────────

export function toInboxItem(row: InboxRowLike & { updatedAt: Date | string }) {
  return {
    id: row.id,
    sourceType: row.sourceType,
    title: row.title,
    url: row.url,
    author: row.author,
    publishedAt: row.publishedAt,
    rawText: row.rawText,
    status: row.status,
    noteId: row.noteId,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}
