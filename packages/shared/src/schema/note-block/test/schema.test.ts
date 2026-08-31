/**
 * Note Doc Blocks — schema tests (#188)
 *
 * Covers:
 * - every block type round-trips through the schema
 * - tolerant reads drop malformed blocks, never throw (安全降级)
 * - limits enforced (block count, text length)
 * - createNoteBlock defaults (heading level, checklist checked)
 */
import { describe, expect, it } from "vitest";

import {
  createNoteBlock,
  MAX_NOTE_BLOCK_TEXT,
  MAX_NOTE_BLOCKS,
  noteBlockSchema,
  noteBlocksSchema,
  sanitizeNoteBlocks,
} from "../index";

let seq = 0;
const generateId = () => `nb_${++seq}`;

describe("noteBlockSchema", () => {
  it("round-trips every block type", () => {
    const blocks = [
      { id: "b1", type: "paragraph", text: "hello" },
      { id: "b2", type: "heading", text: "h", level: 2 },
      { id: "b3", type: "checklist", text: "t", checked: true },
      { id: "b4", type: "quote", text: "q" },
      { id: "b5", type: "callout", text: "c" },
      { id: "b6", type: "evidence_placeholder", text: "待补证据" },
      { id: "b7", type: "live_placeholder", text: "" },
    ];
    for (const b of blocks) {
      expect(noteBlockSchema.safeParse(b).success).toBe(true);
    }
  });

  it("applies defaults for heading level and checklist checked", () => {
    const h = noteBlockSchema.parse({ id: "b", type: "heading", text: "x" });
    expect(h).toMatchObject({ level: 2 });
    const c = noteBlockSchema.parse({ id: "b", type: "checklist", text: "x" });
    expect(c).toMatchObject({ checked: false });
  });

  it("rejects unknown types and oversized text", () => {
    expect(
      noteBlockSchema.safeParse({ id: "b", type: "html", text: "x" }).success,
    ).toBe(false);
    expect(
      noteBlockSchema.safeParse({
        id: "b",
        type: "paragraph",
        text: "x".repeat(MAX_NOTE_BLOCK_TEXT + 1),
      }).success,
    ).toBe(false);
  });
});

describe("sanitizeNoteBlocks", () => {
  it("returns [] for non-array input", () => {
    expect(sanitizeNoteBlocks(null)).toEqual([]);
    expect(sanitizeNoteBlocks("junk")).toEqual([]);
    expect(sanitizeNoteBlocks(undefined)).toEqual([]);
  });

  it("keeps valid blocks, drops malformed ones", () => {
    const out = sanitizeNoteBlocks([
      { id: "ok", type: "paragraph", text: "fine" },
      { id: "bad", type: "nope", text: "drop me" },
      { nope: true },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "ok" });
  });

  it("caps at MAX_NOTE_BLOCKS", () => {
    const many = Array.from({ length: MAX_NOTE_BLOCKS + 10 }, (_, i) => ({
      id: `b${i}`,
      type: "paragraph",
      text: "x",
    }));
    expect(sanitizeNoteBlocks(many)).toHaveLength(MAX_NOTE_BLOCKS);
    expect(noteBlocksSchema.safeParse(many).success).toBe(false);
  });
});

describe("createNoteBlock", () => {
  it("creates blocks with type-appropriate defaults", () => {
    expect(createNoteBlock("paragraph", generateId)).toMatchObject({
      type: "paragraph",
      text: "",
    });
    expect(createNoteBlock("heading", generateId, "T")).toMatchObject({
      type: "heading",
      level: 2,
      text: "T",
    });
    expect(createNoteBlock("checklist", generateId)).toMatchObject({
      type: "checklist",
      checked: false,
    });
    expect(createNoteBlock("live_placeholder", generateId)).toMatchObject({
      type: "live_placeholder",
      text: "",
    });
  });
});
