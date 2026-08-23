/**
 * Live Blocks — note-level refreshable evidence blocks (#167, #152 knife-4)
 *
 * A LiveBlock is a structured evidence unit attached to a research note:
 * it keeps provenance (source / url / date), refresh state, and a neutral
 * failure reason. Refreshing a block updates ONLY the block — the note's
 * immutable artifact (as-of snapshot) is never touched.
 *
 * Core invariants:
 * - structured content only — never arbitrary HTML.
 * - every numeric/claim block carries source + date; unverifiable data is
 *   rejected at the schema boundary.
 * - unverified ≠ no change: refresh state is explicit
 *   (fresh | stale | failed | manual_only).
 * - user-visible refreshError must be neutral — no env / provider /
 *   internal path leakage.
 */

import { z } from "zod";

export const LIVE_BLOCK_TYPES = ["evidence_ref", "source_excerpt"] as const;
export type LiveBlockType = (typeof LIVE_BLOCK_TYPES)[number];

export const LIVE_BLOCK_STALE_STATES = [
  "fresh",
  "stale",
  "failed",
  "manual_only",
] as const;
export type LiveBlockStaleState = (typeof LIVE_BLOCK_STALE_STATES)[number];

/** ISO datetime string — rejects garbage that Date cannot parse. */
const isoDateTime = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "must be a parseable ISO datetime",
  });

/** http(s) only — server-side refresh must never hit file:/ftp:/etc. */
const httpUrl = z
  .string()
  .url()
  .max(2048)
  .refine((v) => /^https?:\/\//i.test(v), {
    message: "must be an http(s) URL",
  });

// ── Structured content per block type ────────────────────────────────────────

/** evidence_ref: a claim backed by source + date (redline: no source/date → reject). */
export const evidenceRefContentSchema = z.object({
  claim: z.string().min(1).max(2000),
  date: z.string().min(1).max(60),
  confidence: z.enum(["verified", "partial", "unverified"]),
});
export type EvidenceRefContent = z.infer<typeof evidenceRefContentSchema>;

/** source_excerpt: a verbatim excerpt from a captured source. */
export const sourceExcerptContentSchema = z.object({
  excerpt: z.string().min(1).max(20000),
});
export type SourceExcerptContent = z.infer<typeof sourceExcerptContentSchema>;

// ── Block schema ─────────────────────────────────────────────────────────────

const liveBlockBase = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  /** Human-readable source name (required — redline). */
  source: z.string().min(1).max(200),
  sourceUrl: httpUrl.optional().or(z.literal("")),
  /** Origin lane: "evidence" | "inbox" | "pdf" | "manual" | ... */
  sourceType: z.string().min(1).max(40),
  evidenceIds: z.array(z.string().min(1)).max(50).default([]),
  capturedAt: isoDateTime,
  lastRefreshedAt: isoDateTime.optional(),
  staleState: z.enum(LIVE_BLOCK_STALE_STATES),
  /** Neutral, user-visible failure reason. Never internal detail. */
  refreshError: z.string().max(300).optional(),
});

export const liveBlockSchema = z.discriminatedUnion("type", [
  liveBlockBase.extend({
    type: z.literal("evidence_ref"),
    content: evidenceRefContentSchema,
  }),
  liveBlockBase.extend({
    type: z.literal("source_excerpt"),
    content: sourceExcerptContentSchema,
  }),
]);
export type LiveBlock = z.infer<typeof liveBlockSchema>;

export const liveBlocksSchema = z.array(liveBlockSchema).max(50);

/**
 * Tolerant reader for the DB column / API payload: keeps valid blocks,
 * drops malformed ones. Never throws — a bad block must not 500 the note
 * page (安全降级 redline).
 */
export function sanitizeLiveBlocks(input: unknown): LiveBlock[] {
  if (!Array.isArray(input)) return [];
  const out: LiveBlock[] = [];
  for (const item of input) {
    const parsed = liveBlockSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}
