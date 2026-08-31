/**
 * Note Block Editor — pure logic (#188)
 *
 * Slash commands, block list operations, and payload normalization for the
 * workspace document canvas. Kept component-free for unit testing.
 *
 * REDLINES:
 * - no fabricated content: commands only change block TYPE/shape; all text
 *   is user-authored.
 * - evidence_placeholder / live_placeholder are honest pointers to the real
 *   insertion paths (right rail / Live Blocks section) — they never render
 *   fake claims, prices, or sources.
 */
import {
  createNoteBlock,
  MAX_NOTE_BLOCKS,
  sanitizeNoteBlocks,
} from "@workspace/shared/schema/note-block";

import type {
  NoteBlock,
  NoteBlockType,
} from "@workspace/shared/schema/note-block";

// ── Slash commands ──────────────────────────────────────────────────────────

export interface SlashCommand {
  /** Trigger token typed after `/` (lowercase, latin). */
  command: string;
  label: string;
  description: string;
  blockType: NoteBlockType;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: "text",
    label: "文本",
    description: "普通段落",
    blockType: "paragraph",
  },
  {
    command: "heading",
    label: "标题",
    description: "小节标题",
    blockType: "heading",
  },
  {
    command: "todo",
    label: "待办清单",
    description: "可勾选的跟踪项",
    blockType: "checklist",
  },
  {
    command: "quote",
    label: "引用",
    description: "引用一段话",
    blockType: "quote",
  },
  {
    command: "callout",
    label: "提示块",
    description: "高亮一段判断或提醒",
    blockType: "callout",
  },
  {
    command: "evidence",
    label: "证据占位",
    description: "标记待插入的证据 — 从右栏插入真实证据",
    blockType: "evidence_placeholder",
  },
  {
    command: "live",
    label: "Live 块占位",
    description: "标记待插入的 Live 证据块 — 在下方 Live 区添加",
    blockType: "live_placeholder",
  },
];

/** Case-insensitive prefix/substring match on the latin command token. */
export function filterSlashCommands(query: string): SlashCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter((c) => c.command.includes(q));
}

/**
 * A block is in "slash mode" while its text is a single `/query` token
 * (starts with `/`, no whitespace). Returns the query or null.
 */
export function slashQuery(text: string): string | null {
  if (!text.startsWith("/")) return null;
  const q = text.slice(1);
  return /\s/.test(q) ? null : q;
}

// ── Block list operations ───────────────────────────────────────────────────

/** Insert a fresh block after `index` (-1 = prepend). Caps at MAX_NOTE_BLOCKS. */
export function insertBlockAfter(
  blocks: NoteBlock[],
  index: number,
  type: NoteBlockType,
  generateId: () => string,
): { blocks: NoteBlock[]; focusIndex: number } {
  if (blocks.length >= MAX_NOTE_BLOCKS) {
    return { blocks, focusIndex: index };
  }
  const block = createNoteBlock(type, generateId);
  const next = blocks.slice();
  next.splice(index + 1, 0, block);
  return { blocks: next, focusIndex: index + 1 };
}

/**
 * Remove the block at `index` (Backspace on an empty block).
 * Returns the list and the index that should take focus (-1 when empty).
 */
export function removeBlockAt(
  blocks: NoteBlock[],
  index: number,
): { blocks: NoteBlock[]; focusIndex: number } {
  const next = blocks.filter((_, i) => i !== index);
  return { blocks: next, focusIndex: Math.min(index - 1, next.length - 1) };
}

/**
 * Apply a slash command to the block at `index`: keep the user's text
 * (minus the `/query` token) and change the block shape in place.
 */
export function applySlashCommand(
  blocks: NoteBlock[],
  index: number,
  command: SlashCommand,
): NoteBlock[] {
  const target = blocks[index];
  if (!target) return blocks;
  // In slash mode the whole text is the `/query` token — strip it.
  const text = slashQuery(target.text) === null ? target.text : "";
  const converted = createNoteBlock(command.blockType, () => target.id, text);
  const next = blocks.slice();
  next[index] = converted;
  return next;
}

/** Update a single block in place (text / checked / level only). */
export function updateBlockAt(
  blocks: NoteBlock[],
  index: number,
  patch: { text?: string; checked?: boolean; level?: 1 | 2 | 3 },
): NoteBlock[] {
  const target = blocks[index];
  if (!target) return blocks;
  const next = blocks.slice();
  switch (target.type) {
    case "heading":
      next[index] = {
        ...target,
        text: patch.text ?? target.text,
        level: patch.level ?? target.level,
      };
      break;
    case "checklist":
      next[index] = {
        ...target,
        text: patch.text ?? target.text,
        checked: patch.checked ?? target.checked,
      };
      break;
    default:
      next[index] = { ...target, text: patch.text ?? target.text };
  }
  return next;
}

/** Normalize for the PATCH payload: tolerant sanitize + cap. */
export function toBlocksPayload(blocks: NoteBlock[]): NoteBlock[] {
  return sanitizeNoteBlocks(blocks);
}

/** Cheap dirty check against the server copy. */
export function blocksEqual(a: NoteBlock[], b: NoteBlock[]): boolean {
  return (
    JSON.stringify(toBlocksPayload(a)) === JSON.stringify(toBlocksPayload(b))
  );
}
