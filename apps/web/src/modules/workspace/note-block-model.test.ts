/**
 * Note Block Editor — logic tests (#188)
 *
 * Covers the issue's checklist:
 * - block normalization (payload shape)
 * - slash command filtering + insertion (block shape conversion)
 * - keyboard ops: Enter appends paragraph, Backspace removes empty block
 * - empty-state: no fabricated blocks, payload round-trips
 */
import { describe, expect, it } from "vitest";

import {
  applySlashCommand,
  blocksEqual,
  filterSlashCommands,
  insertBlockAfter,
  removeBlockAt,
  slashQuery,
  SLASH_COMMANDS,
  toBlocksPayload,
  updateBlockAt,
} from "./note-block-model";

import type { NoteBlock } from "@workspace/shared/schema/note-block";

let seq = 0;
const generateId = () => `nb_${++seq}`;

const para = (id: string, text: string): NoteBlock => ({
  id,
  type: "paragraph",
  text,
});

describe("slash commands", () => {
  it("lists all commands on empty query", () => {
    expect(filterSlashCommands("")).toHaveLength(SLASH_COMMANDS.length);
  });

  it("filters by latin token, case-insensitive", () => {
    const matches = filterSlashCommands("EVI");
    expect(matches).toHaveLength(1);
    expect(matches[0]!.blockType).toBe("evidence_placeholder");
  });

  it("detects slash mode only for a single /query token", () => {
    expect(slashQuery("/head")).toBe("head");
    expect(slashQuery("/")).toBe("");
    expect(slashQuery("text /not")).toBeNull();
    expect(slashQuery("/has space")).toBeNull();
    expect(slashQuery("plain")).toBeNull();
  });

  it("applySlashCommand converts shape and strips the /query token", () => {
    const blocks = [para("b1", "/todo")];
    const cmd = filterSlashCommands("todo")[0]!;
    const next = applySlashCommand(blocks, 0, cmd);
    expect(next[0]).toMatchObject({
      id: "b1", // stable id — block converted in place
      type: "checklist",
      checked: false,
      text: "",
    });
  });

  it("applySlashCommand keeps existing text when not in slash mode", () => {
    const blocks = [para("b1", "real content")];
    const cmd = filterSlashCommands("heading")[0]!;
    const next = applySlashCommand(blocks, 0, cmd);
    expect(next[0]).toMatchObject({
      type: "heading",
      level: 2,
      text: "real content",
    });
  });
});

describe("block list ops", () => {
  it("insertBlockAfter appends an empty paragraph and focuses it", () => {
    const { blocks, focusIndex } = insertBlockAfter(
      [para("a", "one")],
      0,
      "paragraph",
      generateId,
    );
    expect(blocks).toHaveLength(2);
    expect(focusIndex).toBe(1);
    expect(blocks[1]).toMatchObject({ type: "paragraph", text: "" });
    expect(blocks[0]).toMatchObject({ id: "a" });
  });

  it("removeBlockAt removes and focuses the previous block", () => {
    const { blocks, focusIndex } = removeBlockAt(
      [para("a", "x"), para("b", ""), para("c", "y")],
      1,
    );
    expect(blocks.map((b) => b.id)).toEqual(["a", "c"]);
    expect(focusIndex).toBe(0);
  });

  it("removeBlockAt on the only block yields an empty canvas", () => {
    const { blocks, focusIndex } = removeBlockAt([para("a", "")], 0);
    expect(blocks).toEqual([]);
    expect(focusIndex).toBe(-1);
  });

  it("updateBlockAt patches in place without changing id/type", () => {
    const next = updateBlockAt([para("a", "x")], 0, { text: "y" });
    expect(next[0]).toMatchObject({ id: "a", type: "paragraph", text: "y" });
    const toggled = updateBlockAt(
      [{ id: "c", type: "checklist", text: "t", checked: false }],
      0,
      { checked: true },
    );
    expect(toggled[0]).toMatchObject({ type: "checklist", checked: true });
  });
});

describe("payload normalization", () => {
  it("toBlocksPayload round-trips valid blocks and drops junk", () => {
    const payload = toBlocksPayload([
      para("a", "text"),
      { id: "bad", type: "html", text: "x" } as unknown as NoteBlock,
    ]);
    expect(payload).toHaveLength(1);
    expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
  });

  it("blocksEqual treats server copy and equal local copy as clean", () => {
    const server = [para("a", "x")];
    const local = [para("a", "x")];
    expect(blocksEqual(local, server)).toBe(true);
    expect(blocksEqual([para("a", "edited")], server)).toBe(false);
    expect(blocksEqual([], [])).toBe(true);
  });
});
