/**
 * Note Doc Blocks — user-authored document blocks on a research note (#188)
 *
 * The first editable document canvas for `/workspace?object=note:<id>`:
 * paragraph / heading / checklist / quote / callout blocks the user writes
 * themselves, plus honest placeholders that point at the real evidence /
 * live-block insertion paths (right rail / Live Blocks section).
 *
 * Core invariants:
 * - doc blocks are USER-AUTHORED narrative — they live in their own column
 *   (doc_blocks), never inside the immutable as-of artifact and never in
 *   the refresh-managed live_blocks array.
 * - structured content only — plain text per block, no arbitrary HTML.
 * - placeholders carry no fabricated data: evidence_placeholder /
 *   live_placeholder store only the user's own hint text.
 * - tolerant reads: a malformed stored block is dropped, never 500s.
 */

import { z } from "zod";

export const NOTE_BLOCK_TYPES = [
  "paragraph",
  "heading",
  "checklist",
  "quote",
  "callout",
  "evidence_placeholder",
  "live_placeholder",
] as const;
export type NoteBlockType = (typeof NOTE_BLOCK_TYPES)[number];

export const MAX_NOTE_BLOCKS = 200;
export const MAX_NOTE_BLOCK_TEXT = 5000;

const blockText = z.string().max(MAX_NOTE_BLOCK_TEXT);

const noteBlockBase = z.object({
  id: z.string().min(1).max(80),
});

export const noteBlockSchema = z.discriminatedUnion("type", [
  noteBlockBase.extend({
    type: z.literal("paragraph"),
    text: blockText,
  }),
  noteBlockBase.extend({
    type: z.literal("heading"),
    text: blockText,
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  }),
  noteBlockBase.extend({
    type: z.literal("checklist"),
    text: blockText,
    checked: z.boolean().default(false),
  }),
  noteBlockBase.extend({
    type: z.literal("quote"),
    text: blockText,
  }),
  noteBlockBase.extend({
    type: z.literal("callout"),
    text: blockText,
  }),
  // Honest placeholders: user hint text only. Real evidence / live blocks
  // are inserted through the existing evidence rail / Live Blocks paths —
  // these blocks never fabricate claims, prices, or sources.
  noteBlockBase.extend({
    type: z.literal("evidence_placeholder"),
    text: blockText,
  }),
  noteBlockBase.extend({
    type: z.literal("live_placeholder"),
    text: blockText,
  }),
]);
export type NoteBlock = z.infer<typeof noteBlockSchema>;

export const noteBlocksSchema = z.array(noteBlockSchema).max(MAX_NOTE_BLOCKS);

/**
 * Tolerant reader for the DB column / API payload: keeps valid blocks,
 * drops malformed ones. Never throws (安全降级 redline).
 */
export function sanitizeNoteBlocks(input: unknown): NoteBlock[] {
  if (!Array.isArray(input)) return [];
  const out: NoteBlock[] = [];
  for (const item of input) {
    if (out.length >= MAX_NOTE_BLOCKS) break;
    const parsed = noteBlockSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

/** Create a fresh block of the given type with sane defaults. */
export function createNoteBlock(
  type: NoteBlockType,
  generateId: () => string,
  text = "",
): NoteBlock {
  const base = { id: generateId(), text };
  switch (type) {
    case "heading":
      return { ...base, type, level: 2 };
    case "checklist":
      return { ...base, type, checked: false };
    default:
      return { ...base, type };
  }
}
