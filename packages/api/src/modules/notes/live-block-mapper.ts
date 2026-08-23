/**
 * Live Blocks — pure builders (#167)
 *
 * DB-free construction logic, kept pure for unit testing.
 *
 * INVARIANTS:
 * - insert accepts either an EvidenceRef JSON payload or a direct
 *   source_excerpt payload (v1 minimal set).
 * - every block is born with explicit provenance (source + date) and
 *   staleState "fresh" — unverified never masquerades as "no change".
 * - ids / timestamps come from injected deps (deterministic tests).
 */
import { z } from "zod";

import {
  evidenceRefContentSchema,
  liveBlockSchema,
} from "@workspace/shared/schema/live-block";

import type { LiveBlock } from "@workspace/shared/schema/live-block";

// ── Input schemas ────────────────────────────────────────────────────────────

/** Mirrors the #117 EvidenceRef shape (shared evidence model, no second schema). */
const evidenceRefInputSchema = z.object({
  id: z.string().min(1).max(80),
  claim: z.string().min(1).max(2000),
  source: z.string().min(1).max(200),
  date: z.string().min(1).max(60),
  url: z.string().url().max(2048).optional().or(z.literal("")),
  confidence: z.enum(["verified", "partial", "unverified"]),
});

export const insertLiveBlockInputSchema = z.discriminatedUnion("mode", [
  // Insert from an existing EvidenceRef (article evidence / inbox / PDF lane).
  z.object({
    mode: z.literal("evidence_ref"),
    evidenceRef: evidenceRefInputSchema,
    title: z.string().trim().min(1).max(200).optional(),
    sourceType: z.string().trim().min(1).max(40).default("evidence"),
  }),
  // Direct excerpt capture.
  z.object({
    mode: z.literal("source_excerpt"),
    title: z.string().trim().min(1).max(200),
    source: z.string().trim().min(1).max(200),
    sourceUrl: z.string().url().max(2048).optional().or(z.literal("")),
    sourceType: z.string().trim().min(1).max(40).default("manual"),
    excerpt: z.string().min(1).max(20000),
    evidenceIds: z.array(z.string().min(1)).max(50).default([]),
  }),
]);
export type InsertLiveBlockInput = z.infer<typeof insertLiveBlockInputSchema>;

/** Hard cap per note — matches liveBlocksSchema max(50). */
export const MAX_LIVE_BLOCKS_PER_NOTE = 50;

// ── Builder ──────────────────────────────────────────────────────────────────

export interface BuildDeps {
  generateId: () => string;
  now: () => Date;
}

/**
 * Build a LiveBlock from validated input. Returns null when the assembled
 * block fails the shared schema (defense in depth — should not happen for
 * schema-validated input).
 */
export function buildLiveBlock(
  input: InsertLiveBlockInput,
  deps: BuildDeps,
): LiveBlock | null {
  const capturedAt = deps.now().toISOString();

  const candidate =
    input.mode === "evidence_ref"
      ? {
          id: deps.generateId(),
          type: "evidence_ref" as const,
          title: input.title ?? input.evidenceRef.claim.slice(0, 200),
          source: input.evidenceRef.source,
          sourceUrl: input.evidenceRef.url || undefined,
          sourceType: input.sourceType,
          evidenceIds: [input.evidenceRef.id],
          content: {
            claim: input.evidenceRef.claim,
            date: input.evidenceRef.date,
            confidence: input.evidenceRef.confidence,
          },
          capturedAt,
          staleState: "fresh" as const,
        }
      : {
          id: deps.generateId(),
          type: "source_excerpt" as const,
          title: input.title,
          source: input.source,
          sourceUrl: input.sourceUrl || undefined,
          sourceType: input.sourceType,
          evidenceIds: input.evidenceIds,
          content: { excerpt: input.excerpt },
          capturedAt,
          staleState: "fresh" as const,
        };

  const parsed = liveBlockSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

/**
 * Apply a refresh outcome to a block. ONLY refresh fields change — id /
 * type / title / source / content / capturedAt are never rewritten by a
 * refresh (redline: refresh must not silently rewrite captured content).
 */
export function applyRefreshOutcome(
  block: LiveBlock,
  outcome: {
    staleState: LiveBlock["staleState"];
    lastRefreshedAt?: string;
    refreshError?: string;
  },
): LiveBlock {
  const next: LiveBlock = { ...block, staleState: outcome.staleState };
  if (outcome.lastRefreshedAt !== undefined) {
    next.lastRefreshedAt = outcome.lastRefreshedAt;
  }
  if (outcome.refreshError !== undefined) {
    next.refreshError = outcome.refreshError;
  } else {
    delete next.refreshError;
  }
  return next;
}

// Re-export for route-layer convenience (single import site).
export { evidenceRefContentSchema };
