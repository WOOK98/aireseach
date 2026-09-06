/**
 * Editor-level dispatch tests — exercises the REAL resolveKeyDispatch and
 * menuForIndex from note-block-model.ts, the same functions imported by
 * NoteBlockEditor. Deleting the real editor's dispatch logic breaks both
 * the component and these tests — they share the production code path.
 *
 * Covers:
 * - /分析 TSLA → menu resolves → Enter dispatches analyze action
 * - /分析 蔚蓝生物 → menu resolves → Enter dispatches analyze action
 * - /unknown → no menu → Enter inserts paragraph (not command)
 * - bare / → menu shows all commands → Enter selects first
 * - /heading → menu → Enter converts block type
 * - IME composition guard: isComposing=true → Enter does nothing
 * - ArrowDown/ArrowUp navigate menu, Escape dismisses
 * - Backspace on empty block
 */
import { describe, expect, it } from "vitest";

import {
  menuForIndex,
  resolveKeyDispatch,
  slashQuery,
  SLASH_COMMANDS,
} from "./note-block-model";

import type { NoteBlock } from "@workspace/shared/schema/note-block";

// ── Helpers ─────────────────────────────────────────────────────────────────

const para = (id: string, text: string): NoteBlock => ({
  id,
  type: "paragraph",
  text,
});

// ── /分析 TSLA — the regression case ────────────────────────────────────────

describe("editor dispatch — /分析 TSLA", () => {
  it("slashQuery returns '分析 TSLA' (not null — space is valid)", () => {
    expect(slashQuery("/分析 TSLA")).toBe("分析 TSLA");
  });

  it("menuForIndex resolves to the 分析 command", () => {
    const blocks = [para("b1", "/分析 TSLA")];
    const menu = menuForIndex(blocks, 0);
    expect(menu).not.toBeNull();
    expect(menu).toHaveLength(1);
    expect(menu![0]!.command).toBe("分析");
    expect(menu![0]!.action).toBe("analyze");
  });

  it("resolveKeyDispatch returns analyze with full text", () => {
    const blocks = [para("b1", "/分析 TSLA")];
    const result = resolveKeyDispatch(blocks, 0, {
      key: "Enter",
      isComposing: false,
      shiftKey: false,
      menuIndex: 0,
    });
    expect(result).not.toBeNull();
    expect(result!.action).toBe("analyze");
    if (result!.action === "analyze") {
      expect(result!.analyzeText).toBe("/分析 TSLA");
    }
  });
});

// ── /分析 蔚蓝生物 — Chinese multi-char argument ────────────────────────────

describe("editor dispatch — /分析 蔚蓝生物", () => {
  it("slashQuery returns '分析 蔚蓝生物' (not null)", () => {
    expect(slashQuery("/分析 蔚蓝生物")).toBe("分析 蔚蓝生物");
  });

  it("menuForIndex resolves to the 分析 command", () => {
    const blocks = [para("b1", "/分析 蔚蓝生物")];
    const menu = menuForIndex(blocks, 0);
    expect(menu).not.toBeNull();
    expect(menu).toHaveLength(1);
    expect(menu![0]!.command).toBe("分析");
    expect(menu![0]!.action).toBe("analyze");
  });

  it("resolveKeyDispatch returns analyze with full text", () => {
    const blocks = [para("b1", "/分析 蔚蓝生物")];
    const result = resolveKeyDispatch(blocks, 0, {
      key: "Enter",
      isComposing: false,
      shiftKey: false,
      menuIndex: 0,
    });
    expect(result).not.toBeNull();
    expect(result!.action).toBe("analyze");
    if (result!.action === "analyze") {
      expect(result!.analyzeText).toBe("/分析 蔚蓝生物");
    }
  });
});

// ── Unknown command — no menu, Enter inserts paragraph ──────────────────────

describe("editor dispatch — unknown command", () => {
  it("slashQuery returns 'unknowncmd' (slash mode active)", () => {
    expect(slashQuery("/unknowncmd")).toBe("unknowncmd");
  });

  it("menuForIndex returns null for non-matching query", () => {
    const blocks = [para("b1", "/unknowncmd")];
    const menu = menuForIndex(blocks, 0);
    expect(menu).toBeNull();
  });

  it("resolveKeyDispatch returns insert when no menu", () => {
    const blocks = [para("b1", "/unknowncmd")];
    const result = resolveKeyDispatch(blocks, 0, {
      key: "Enter",
      isComposing: false,
      shiftKey: false,
      menuIndex: 0,
    });
    expect(result).not.toBeNull();
    expect(result!.action).toBe("insert");
  });
});

// ── Bare / — shows all commands ──────────────────────────────────────────────

describe("editor dispatch — bare /", () => {
  it("slashQuery returns '' for bare slash", () => {
    expect(slashQuery("/")).toBe("");
  });

  it("menuForIndex shows all commands for bare /", () => {
    const blocks = [para("b1", "/")];
    const menu = menuForIndex(blocks, 0);
    expect(menu).not.toBeNull();
    expect(menu).toHaveLength(SLASH_COMMANDS.length);
  });

  it("resolveKeyDispatch returns apply with first command on Enter", () => {
    const blocks = [para("b1", "/")];
    const result = resolveKeyDispatch(blocks, 0, {
      key: "Enter",
      isComposing: false,
      shiftKey: false,
      menuIndex: 0,
    });
    expect(result).not.toBeNull();
    expect(result!.action).toBe("apply");
    if (result!.action === "apply") {
      expect(result!.command.command).toBe("text");
    }
  });
});

// ── /heading — non-analyze command dispatch ──────────────────────────────────

describe("editor dispatch — /heading", () => {
  it("menuForIndex resolves to heading command", () => {
    const blocks = [para("b1", "/heading")];
    const menu = menuForIndex(blocks, 0);
    expect(menu).not.toBeNull();
    expect(menu![0]!.command).toBe("heading");
    expect(menu![0]!.action).toBeUndefined();
  });

  it("resolveKeyDispatch returns apply with heading conversion", () => {
    const blocks = [para("b1", "/heading")];
    const result = resolveKeyDispatch(blocks, 0, {
      key: "Enter",
      isComposing: false,
      shiftKey: false,
      menuIndex: 0,
    });
    expect(result).not.toBeNull();
    expect(result!.action).toBe("apply");
    if (result!.action === "apply") {
      expect(result!.command.command).toBe("heading");
      expect(result!.blocks[0]!.type).toBe("heading");
    }
  });
});

// ── IME composition guard ───────────────────────────────────────────────────

describe("editor dispatch — IME composition guard", () => {
  it("Enter during IME composition returns ime-guard (even with menu open)", () => {
    const blocks = [para("b1", "/分析 TSLA")];
    const result = resolveKeyDispatch(blocks, 0, {
      key: "Enter",
      isComposing: true,
      shiftKey: false,
      menuIndex: 0,
    });
    expect(result).not.toBeNull();
    expect(result!.action).toBe("ime-guard");
  });

  it("Enter during IME composition on bare / returns ime-guard", () => {
    const blocks = [para("b1", "/")];
    const result = resolveKeyDispatch(blocks, 0, {
      key: "Enter",
      isComposing: true,
      shiftKey: false,
      menuIndex: 0,
    });
    expect(result).not.toBeNull();
    expect(result!.action).toBe("ime-guard");
  });

  it("Enter after IME composition ends dispatches normally", () => {
    const blocks = [para("b1", "/分析 TSLA")];
    const result = resolveKeyDispatch(blocks, 0, {
      key: "Enter",
      isComposing: false,
      shiftKey: false,
      menuIndex: 0,
    });
    expect(result).not.toBeNull();
    expect(result!.action).toBe("analyze");
  });
});

// ── Menu navigation (ArrowDown/ArrowUp) ─────────────────────────────────────

describe("editor dispatch — menu navigation", () => {
  it("ArrowDown returns menu-nav down", () => {
    const blocks = [para("b1", "/")];
    const result = resolveKeyDispatch(blocks, 0, {
      key: "ArrowDown",
      isComposing: false,
      shiftKey: false,
      menuIndex: 0,
    });
    expect(result).not.toBeNull();
    expect(result!.action).toBe("menu-nav");
    if (result!.action === "menu-nav") {
      expect(result!.direction).toBe("down");
    }
  });

  it("ArrowUp returns menu-nav up", () => {
    const blocks = [para("b1", "/")];
    const result = resolveKeyDispatch(blocks, 0, {
      key: "ArrowUp",
      isComposing: false,
      shiftKey: false,
      menuIndex: 0,
    });
    expect(result).not.toBeNull();
    expect(result!.action).toBe("menu-nav");
    if (result!.action === "menu-nav") {
      expect(result!.direction).toBe("up");
    }
  });

  it("menuIndex is clamped to menu length on Enter", () => {
    const blocks = [para("b1", "/callout")];
    const menu = menuForIndex(blocks, 0)!;
    const result = resolveKeyDispatch(blocks, 0, {
      key: "Enter",
      isComposing: false,
      shiftKey: false,
      menuIndex: 999,
    });
    expect(result).not.toBeNull();
    expect(result!.action).toBe("apply");
    if (result!.action === "apply") {
      expect(result!.command.command).toBe(menu[menu.length - 1]!.command);
    }
  });
});

// ── Escape — dismisses menu ─────────────────────────────────────────────────

describe("editor dispatch — Escape", () => {
  it("Escape with menu open returns dismiss", () => {
    const blocks = [para("b1", "/heading")];
    const result = resolveKeyDispatch(blocks, 0, {
      key: "Escape",
      isComposing: false,
      shiftKey: false,
      menuIndex: 0,
    });
    expect(result).not.toBeNull();
    expect(result!.action).toBe("dismiss");
  });

  it("Escape without menu returns blur", () => {
    const blocks = [para("b1", "plain text")];
    const result = resolveKeyDispatch(blocks, 0, {
      key: "Escape",
      isComposing: false,
      shiftKey: false,
      menuIndex: 0,
    });
    expect(result).not.toBeNull();
    expect(result!.action).toBe("blur");
  });
});

// ── Backspace on empty block ────────────────────────────────────────────────

describe("editor dispatch — Backspace", () => {
  it("Backspace on empty block returns backspace-empty", () => {
    const blocks = [para("b1", "before"), para("b2", ""), para("b3", "after")];
    const result = resolveKeyDispatch(blocks, 1, {
      key: "Backspace",
      isComposing: false,
      shiftKey: false,
      menuIndex: 0,
    });
    expect(result).not.toBeNull();
    expect(result!.action).toBe("backspace-empty");
  });

  it("Backspace on non-empty block returns null (let browser handle)", () => {
    const blocks = [para("b1", "has text")];
    const result = resolveKeyDispatch(blocks, 0, {
      key: "Backspace",
      isComposing: false,
      shiftKey: false,
      menuIndex: 0,
    });
    expect(result).toBeNull();
  });
});

// ── Non-slash text — no menu, Enter inserts ─────────────────────────────────

describe("editor dispatch — plain text (no slash)", () => {
  it("slashQuery returns null for plain text", () => {
    expect(slashQuery("hello world")).toBeNull();
  });

  it("menuForIndex returns null for plain text", () => {
    const blocks = [para("b1", "hello world")];
    expect(menuForIndex(blocks, 0)).toBeNull();
  });

  it("resolveKeyDispatch returns insert for plain text Enter", () => {
    const blocks = [para("b1", "hello world")];
    const result = resolveKeyDispatch(blocks, 0, {
      key: "Enter",
      isComposing: false,
      shiftKey: false,
      menuIndex: 0,
    });
    expect(result).not.toBeNull();
    expect(result!.action).toBe("insert");
  });

  it("Shift+Enter on plain text returns null (let browser handle)", () => {
    const blocks = [para("b1", "hello world")];
    const result = resolveKeyDispatch(blocks, 0, {
      key: "Enter",
      isComposing: false,
      shiftKey: true,
      menuIndex: 0,
    });
    expect(result).toBeNull();
  });
});

// ── /分析 with no argument — still dispatches analyze ───────────────────────

describe("editor dispatch — /分析 (no argument)", () => {
  it("menuForIndex still resolves to 分析 command", () => {
    const blocks = [para("b1", "/分析")];
    const menu = menuForIndex(blocks, 0);
    expect(menu).not.toBeNull();
    expect(menu![0]!.command).toBe("分析");
  });

  it("resolveKeyDispatch returns analyze (handler checks for empty arg)", () => {
    const blocks = [para("b1", "/分析")];
    const result = resolveKeyDispatch(blocks, 0, {
      key: "Enter",
      isComposing: false,
      shiftKey: false,
      menuIndex: 0,
    });
    expect(result).not.toBeNull();
    expect(result!.action).toBe("analyze");
    if (result!.action === "analyze") {
      expect(result!.analyzeText).toBe("/分析");
    }
  });
});
