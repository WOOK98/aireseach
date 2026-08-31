"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Note Block Editor — the editable document canvas for /workspace (#188)
 *
 * Notion-style block editing over the note's `doc_blocks` column:
 * inline paragraph editing, `/` slash menu (text / heading / checklist /
 * quote / callout / evidence placeholder / live placeholder), Enter to
 * append a paragraph, Backspace on empty to remove, Escape to dismiss.
 *
 * Persistence: PATCH /api/notes/:id { blocks } — full-array replacement of
 * the user-authored canvas. The immutable artifact and live_blocks are
 * never touched here.
 *
 * REDLINES:
 * - no mock/demo data: blocks come from the note row and the user's typing.
 * - placeholders are honest pointers to real insertion paths; they render
 *   no fabricated claims, prices, ratings, or sources.
 * - dynamic text inputs carry notranslate.
 */
import {
  Heading2,
  ListChecks,
  Loader2,
  Plus,
  Quote,
  Save,
  Sparkles,
  Type,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { generateId } from "@workspace/shared/utils";
import { Badge } from "@workspace/ui-web/badge";
import { Button } from "@workspace/ui-web/button";

import { patchNote } from "~/modules/notes/use-notes";
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
  type SlashCommand,
} from "~/modules/workspace/note-block-model";

import type { NoteBlock } from "@workspace/shared/schema/note-block";
import type { KeyboardEvent } from "react";
import type { NoteDetail } from "~/modules/notes/use-notes";

const BLOCK_ICON: Record<string, typeof Type> = {
  paragraph: Type,
  heading: Heading2,
  checklist: ListChecks,
  quote: Quote,
  callout: Sparkles,
  evidence_placeholder: Quote,
  live_placeholder: Zap,
};

const PLACEHOLDER_TEXT: Record<NoteBlock["type"], string> = {
  paragraph: "输入内容，/ 唤起命令",
  heading: "小节标题",
  checklist: "跟踪项",
  quote: "引用内容",
  callout: "你的判断或提醒",
  evidence_placeholder: "证据占位 — 从右栏插入真实证据后替换",
  live_placeholder: "Live 块占位 — 在下方 Live 证据区添加真实块",
};

const BLOCK_STYLE: Record<NoteBlock["type"], string> = {
  paragraph: "text-sm leading-relaxed",
  heading: "text-base font-semibold",
  checklist: "text-sm leading-relaxed",
  quote: "text-sm leading-relaxed italic",
  callout: "text-sm leading-relaxed",
  evidence_placeholder: "text-muted-foreground text-xs italic",
  live_placeholder: "text-muted-foreground text-xs italic",
};

export function NoteBlockEditor({
  note,
  onSaved,
}: {
  note: NoteDetail;
  onSaved: () => Promise<unknown>;
}) {
  const [blocks, setBlocks] = useState<NoteBlock[]>(() => note.blocks ?? []);
  const [saving, setSaving] = useState(false);
  const [menuIndex, setMenuIndex] = useState(0);
  const [focusRequest, setFocusRequest] = useState<number | null>(null);
  const areaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  // Reset local canvas when a different note (or a fresh server copy) loads.
  useEffect(() => {
    setBlocks(note.blocks ?? []);
  }, [note.id, note.updatedAt, note.blocks]);

  const dirty = useMemo(
    () => !blocksEqual(blocks, note.blocks ?? []),
    [blocks, note.blocks],
  );

  // Focus management after structural edits.
  useEffect(() => {
    if (focusRequest === null) return;
    const el = areaRefs.current[focusRequest];
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    setFocusRequest(null);
  }, [focusRequest, blocks.length]);

  const menuForIndex = (index: number): SlashCommand[] | null => {
    const block = blocks[index];
    if (!block) return null;
    const q = slashQuery(block.text);
    if (q === null) return null;
    const matches = filterSlashCommands(q);
    return matches.length > 0 ? matches : null;
  };

  function mutate(
    index: number,
    patch: { text?: string; checked?: boolean; level?: 1 | 2 | 3 },
  ) {
    setBlocks((prev) => updateBlockAt(prev, index, patch));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>, index: number) {
    const menu = menuForIndex(index);

    if (menu) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setMenuIndex(
          (m) =>
            (m + (e.key === "ArrowDown" ? 1 : menu.length - 1)) % menu.length,
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = menu[Math.min(menuIndex, menu.length - 1)]!;
        setBlocks((prev) => applySlashCommand(prev, index, cmd));
        setMenuIndex(0);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        mutate(index, { text: "" });
        setMenuIndex(0);
        return;
      }
      return; // while the menu is open, let typing filter it
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      setBlocks((prev) => {
        const result = insertBlockAfter(prev, index, "paragraph", generateId);
        setFocusRequest(result.focusIndex);
        return result.blocks;
      });
      return;
    }

    if (e.key === "Escape") {
      (e.target as HTMLTextAreaElement).blur();
      return;
    }

    if (e.key === "Backspace") {
      const block = blocks[index];
      if (block && block.text === "" && blocks.length > 0) {
        e.preventDefault();
        setBlocks((prev) => {
          const result = removeBlockAt(prev, index);
          if (result.focusIndex >= 0) setFocusRequest(result.focusIndex);
          return result.blocks;
        });
      }
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await patchNote(note.id, { blocks: toBlocksPayload(blocks) });
      toast.success("文档块已保存");
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  const empty = blocks.length === 0;

  return (
    <section className="space-y-3">
      {/* ── Section header — document chrome, save state is explicit ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Type className="size-4 shrink-0" />
          文档块
          <span
            className="notranslate text-muted-foreground text-xs font-normal"
            translate="no"
          >
            {blocks.length}
          </span>
          {dirty && (
            <Badge variant="secondary" className="text-[10px]">
              未保存
            </Badge>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            Enter 新块 · / 命令 · 空块回退删除
          </span>
          <Button
            size="sm"
            variant={dirty ? "default" : "outline"}
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            保存文档块
          </Button>
        </div>
      </div>

      {empty ? (
        <button
          type="button"
          onClick={() => {
            setBlocks((prev) => {
              const result = insertBlockAfter(
                prev,
                -1,
                "paragraph",
                generateId,
              );
              setFocusRequest(result.focusIndex);
              return result.blocks;
            });
          }}
          className="hover:bg-accent/50 flex w-full items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-left transition-colors"
        >
          <Plus className="text-muted-foreground size-4 shrink-0" />
          <span className="text-muted-foreground text-xs leading-relaxed">
            开始撰写 — 添加第一个段落块，输入 / 插入标题、清单、证据占位等
          </span>
        </button>
      ) : (
        <div className="space-y-1">
          {blocks.map((block, index) => {
            const menu = menuForIndex(index);
            const Icon = BLOCK_ICON[block.type] ?? Type;
            const isPlaceholder =
              block.type === "evidence_placeholder" ||
              block.type === "live_placeholder";
            return (
              <div key={block.id} className="relative">
                <div
                  className={`group flex items-start gap-2 rounded-md px-2 py-1 ${
                    block.type === "quote"
                      ? "border-l-2 border-blue-300 dark:border-blue-700"
                      : ""
                  } ${
                    block.type === "callout"
                      ? "rounded-lg border border-amber-200/60 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/10"
                      : ""
                  } ${
                    isPlaceholder
                      ? "rounded-lg border border-dashed border-violet-300/70 bg-violet-50/40 dark:border-violet-800/50 dark:bg-violet-950/10"
                      : ""
                  }`}
                >
                  {block.type === "checklist" ? (
                    <input
                      type="checkbox"
                      checked={block.checked}
                      onChange={(e) =>
                        mutate(index, { checked: e.target.checked })
                      }
                      className="mt-2 size-3.5 shrink-0 accent-current"
                      aria-label="勾选"
                    />
                  ) : (
                    <Icon className="text-muted-foreground/60 mt-2 size-3.5 shrink-0" />
                  )}
                  <textarea
                    ref={(el) => {
                      areaRefs.current[index] = el;
                    }}
                    value={block.text}
                    onChange={(e) => {
                      mutate(index, { text: e.target.value });
                      setMenuIndex(0);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className={`notranslate min-w-0 flex-1 resize-none bg-transparent px-0 py-1 shadow-none focus:outline-none ${BLOCK_STYLE[block.type]}`}
                    translate="no"
                    placeholder={PLACEHOLDER_TEXT[block.type]}
                    rows={Math.min(
                      8,
                      Math.max(1, block.text.split("\n").length),
                    )}
                    maxLength={5000}
                  />
                  {block.type === "checklist" && block.checked && (
                    <Badge
                      variant="outline"
                      className="mt-1.5 shrink-0 text-[10px]"
                    >
                      已完成
                    </Badge>
                  )}
                </div>

                {/* ── Slash menu — anchored under the active block ── */}
                {menu && (
                  <div className="bg-popover absolute top-full left-8 z-20 mt-1 w-64 rounded-lg border p-1 shadow-lg">
                    {menu.map((cmd, mi) => (
                      <button
                        key={cmd.command}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setBlocks((prev) =>
                            applySlashCommand(prev, index, cmd),
                          );
                          setMenuIndex(0);
                          setFocusRequest(index);
                        }}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                          mi === Math.min(menuIndex, menu.length - 1)
                            ? "bg-accent"
                            : ""
                        }`}
                      >
                        <span className="shrink-0 font-medium">
                          {cmd.label}
                        </span>
                        <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
                          {cmd.description}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-muted-foreground text-[11px] leading-relaxed">
        文档块是你自己撰写的内容，保存到笔记，不影响下方数据快照与 Live 证据块。
      </p>
      {/* Slash command discoverability (static list, no data) */}
      <p className="text-muted-foreground/70 text-[11px] leading-relaxed">
        可用命令：
        {SLASH_COMMANDS.map((c) => `/${c.command}`).join(" · ")}
      </p>
    </section>
  );
}
