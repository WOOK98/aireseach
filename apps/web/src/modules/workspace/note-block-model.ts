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
  /** If set, this command triggers an action instead of block type change. */
  action?: "analyze";
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
    command: "分析",
    label: "分析",
    description: "输入 ticker 或主题，生成分析插入正文",
    blockType: "paragraph",
    action: "analyze",
  },
];

/** Case-insensitive prefix/substring match on the latin command token. */
export function filterSlashCommands(query: string): SlashCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter(
    (c) => c.command.includes(q) || q.startsWith(c.command),
  );
}

/**
 * A block is in "slash mode" while its text starts with `/`.
 * Returns the query string (everything after `/`), or null.
 * Supports both `/cmd` and `/cmd arg` patterns.
 */
export function slashQuery(text: string): string | null {
  if (!text.startsWith("/")) return null;
  return text.slice(1);
}

/** Extract the argument from a slash command like `/分析 TSLA` → `TSLA`. */
export function slashArg(text: string): string | null {
  const q = slashQuery(text);
  if (!q) return null;
  const spaceIdx = q.indexOf(" ");
  return spaceIdx > 0 ? q.slice(spaceIdx + 1).trim() : null;
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

// ── Key dispatch (shared between component and tests) ──────────────────────

/**
 * Pure key-event dispatch — resolves the action for a keydown event on a
 * note block. Used by NoteBlockEditor.handleKeyDown AND exercised by
 * note-block-editor-dispatch.test.ts so that tests and component share
 * the exact same code path (deleting the real handler breaks both).
 *
 * The component is responsible for: state updates, focus management,
 * and calling handleAnalyze. This function only resolves WHAT to do.
 */
export function resolveKeyDispatch(
  blocks: NoteBlock[],
  index: number,
  opts: {
    key: string;
    isComposing: boolean;
    shiftKey: boolean;
    menuIndex: number;
  },
):
  | {
      action: "ime-guard" | "insert" | "blur";
    }
  | {
      action: "menu-nav";
      direction: "up" | "down";
    }
  | {
      action: "select-command";
      nextMenuIndex: number;
    }
  | {
      action: "analyze";
      analyzeText: string;
    }
  | {
      action: "apply";
      command: SlashCommand;
      blocks: NoteBlock[];
    }
  | {
      action: "dismiss";
    }
  | {
      action: "backspace-empty";
    }
  | null {
  const menu = menuForIndex(blocks, index);

  // IME composition guard — compositionEnd must not execute a command.
  if (opts.isComposing) return { action: "ime-guard" };

  if (menu) {
    if (opts.key === "ArrowDown" || opts.key === "ArrowUp") {
      return {
        action: "menu-nav",
        direction: opts.key === "ArrowDown" ? "down" : "up",
      };
    }
    if (opts.key === "Enter") {
      const cmd = menu[Math.min(opts.menuIndex, menu.length - 1)]!;
      if (cmd.action === "analyze") {
        return { action: "analyze", analyzeText: blocks[index]?.text ?? "" };
      }
      return {
        action: "apply",
        command: cmd,
        blocks: applySlashCommand(blocks, index, cmd),
      };
    }
    if (opts.key === "Escape") {
      return { action: "dismiss" };
    }
    return null; // while menu is open, let typing filter it
  }

  if (opts.key === "Enter" && !opts.shiftKey) {
    return { action: "insert" };
  }

  if (opts.key === "Escape") {
    return { action: "blur" };
  }

  if (opts.key === "Backspace") {
    const block = blocks[index];
    if (block && block.text === "" && blocks.length > 0) {
      return { action: "backspace-empty" };
    }
  }

  return null;
}

/** Internal: resolve menu for a block index (used by resolveKeyDispatch and the component render). */
export function menuForIndex(
  blocks: NoteBlock[],
  index: number,
): SlashCommand[] | null {
  const block = blocks[index];
  if (!block) return null;
  const q = slashQuery(block.text);
  if (q === null) return null;
  const matches = filterSlashCommands(q);
  return matches.length > 0 ? matches : null;
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
