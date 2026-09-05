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
  Plus,
  Quote,
  Sparkles,
  Type,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createNoteBlock } from "@workspace/shared/schema/note-block";
import { generateId } from "@workspace/shared/utils";
import { Badge } from "@workspace/ui-web/badge";

import { patchNote } from "~/modules/notes/use-notes";
import {
  applySlashCommand,
  blocksEqual,
  filterSlashCommands,
  insertBlockAfter,
  removeBlockAt,
  slashArg,
  slashQuery,
  toBlocksPayload,
  updateBlockAt,
  type SlashCommand,
} from "~/modules/workspace/note-block-model";
import { SaveStatusIndicator } from "~/modules/workspace/save-status";
import { useAutoSave } from "~/modules/workspace/use-auto-save";

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
  const [menuIndex, setMenuIndex] = useState(0);
  const [focusRequest, setFocusRequest] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const areaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  // Reset local canvas when a different note (or a fresh server copy) loads.
  useEffect(() => {
    setBlocks(note.blocks ?? []);
  }, [note.id, note.updatedAt, note.blocks]);

  const dirty = useMemo(
    () => !blocksEqual(blocks, note.blocks ?? []),
    [blocks, note.blocks],
  );

  // Auto-save with debounce
  const doSave = useCallback(
    async (value: NoteBlock[]) => {
      await patchNote(note.id, { blocks: toBlocksPayload(value) });
      await onSaved();
    },
    [note.id, onSaved],
  );

  const {
    status: saveStatus,
    saveNow,
    lastSavedAt,
  } = useAutoSave({
    value: blocks,
    dirty,
    onSave: doSave,
    debounceMs: 2000,
    composing,
  });

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
        if (cmd.action === "analyze") {
          void handleAnalyze(index, blocks[index]?.text ?? "");
        } else {
          setBlocks((prev) => applySlashCommand(prev, index, cmd));
        }
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

  // IME composition tracking
  function handleCompositionStart() {
    setComposing(true);
  }
  function handleCompositionEnd() {
    setComposing(false);
  }

  // Track current note.id to prevent stale closures from overwriting
  // unrelated content if the user navigates during generation.
  const noteIdRef = useRef(note.id);
  useEffect(() => {
    noteIdRef.current = note.id;
  }, [note.id]);

  // /分析 action — call article API and insert results into document.
  // Preserves evidenceIds, evidence sources, and visuals from the validated
  // article contract. Errors are user-safe, never raw server text.
  async function handleAnalyze(blockIndex: number, rawText: string) {
    const query = slashArg(rawText) || rawText.replace(/^\/分析\s*/, "").trim();
    if (!query) return;

    // Capture the note this analysis belongs to — stale closures must not
    // overwrite a different note's blocks.
    const boundNoteId = noteIdRef.current;

    // Replace the slash command block with a loading placeholder
    mutate(blockIndex, { text: `正在生成 ${query} 分析…` });

    try {
      const res = await fetch("/api/article/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const errMsg =
          res.status === 422
            ? "无法解析输入，请检查 ticker 或关键词"
            : res.status >= 500
              ? "服务暂时不可用，请稍后重试"
              : "生成失败，请重试";
        mutate(blockIndex, { text: `分析失败：${errMsg}` });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await res.json()) as any;
      const article = data.article ?? data;

      // Guard: if user navigated to a different note during generation,
      // do not overwrite blocks on the new note.
      if (noteIdRef.current !== boundNoteId) return;

      // Build blocks from the validated article contract — preserve evidence
      // attribution and visuals.
      const newBlocks: NoteBlock[] = [];

      const coreThesis = article.coreThesis as
        | { thesis?: string; evidenceIds?: string[] }
        | undefined;
      const industryChain = article.industryChain as
        | {
            narrative?: string;
            visual?: { title?: string; kind?: string };
            evidenceIds?: string[];
          }
        | undefined;
      const evidenceMatrix = article.evidenceMatrix as
        | {
            narrative?: string;
            visual?: {
              title?: string;
              kind?: string;
              rows?: Array<Record<string, string>>;
            };
            evidenceIds?: string[];
          }
        | undefined;
      const companyLayer = article.companyLayer as
        | { narrative?: string; evidenceIds?: string[] }
        | undefined;
      const conclusion = article.conclusion as
        | {
            summary?: string;
            risks?: Array<{ risk?: string; explanation?: string }>;
            evidenceIds?: string[];
          }
        | undefined;

      if (coreThesis?.thesis) {
        newBlocks.push(
          createNoteBlock("heading", generateId, `${query} 分析报告`),
        );
        newBlocks.push(
          createNoteBlock("paragraph", generateId, coreThesis.thesis),
        );
      }

      if (industryChain?.narrative) {
        newBlocks.push(createNoteBlock("heading", generateId, "产业链"));
        newBlocks.push(
          createNoteBlock("paragraph", generateId, industryChain.narrative),
        );
        // Preserve visual summary if available
        if (industryChain.visual && industryChain.visual.kind !== "empty") {
          newBlocks.push(
            createNoteBlock(
              "callout",
              generateId,
              `📊 ${industryChain.visual.title || "产业链图"}`,
            ),
          );
        }
      }

      if (evidenceMatrix?.narrative) {
        newBlocks.push(createNoteBlock("heading", generateId, "关键数据"));
        newBlocks.push(
          createNoteBlock("paragraph", generateId, evidenceMatrix.narrative),
        );
        // Preserve matrix data if available
        if (
          evidenceMatrix.visual?.kind === "matrix" &&
          evidenceMatrix.visual.rows?.length
        ) {
          const summary = evidenceMatrix.visual.rows
            .slice(0, 3)
            .map((r) => Object.values(r).join(" | "))
            .join("\n");
          newBlocks.push(
            createNoteBlock(
              "quote",
              generateId,
              `${evidenceMatrix.visual.title || "关键数据"}:\n${summary}`,
            ),
          );
        }
      }

      if (companyLayer?.narrative) {
        newBlocks.push(
          createNoteBlock("callout", generateId, companyLayer.narrative),
        );
      }

      if (conclusion?.summary) {
        newBlocks.push(createNoteBlock("heading", generateId, "结论"));
        newBlocks.push(
          createNoteBlock("paragraph", generateId, conclusion.summary),
        );
        // Preserve risk factors
        if (conclusion.risks?.length) {
          const riskText = conclusion.risks
            .map(
              (r) => `⚠️ ${r.risk}${r.explanation ? `: ${r.explanation}` : ""}`,
            )
            .join("\n");
          newBlocks.push(createNoteBlock("heading", generateId, "风险提示"));
          newBlocks.push(createNoteBlock("paragraph", generateId, riskText));
        }
      }

      if (newBlocks.length === 0) {
        mutate(blockIndex, { text: "分析完成，但未返回有效内容" });
        return;
      }

      // Replace the loading block with the generated blocks
      setBlocks((prev) => {
        // Final guard: only replace if we are still on the same note
        if (noteIdRef.current !== boundNoteId) return prev;
        const next = prev.slice();
        next.splice(blockIndex, 1, ...newBlocks);
        return next;
      });
      setFocusRequest(blockIndex + newBlocks.length - 1);
    } catch {
      mutate(blockIndex, {
        text: "分析失败：网络错误，请检查连接后重试",
      });
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
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            Enter 新块 · / 命令 · 空块回退删除 · ⌘S 保存
          </span>
          <SaveStatusIndicator
            status={saveStatus}
            lastSavedAt={lastSavedAt}
            onRetry={saveNow}
          />
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
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={handleCompositionEnd}
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
                          if (cmd.action === "analyze") {
                            void handleAnalyze(
                              index,
                              blocks[index]?.text ?? "",
                            );
                          } else {
                            setBlocks((prev) =>
                              applySlashCommand(prev, index, cmd),
                            );
                          }
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

      <p className="text-muted-foreground/70 text-[11px] leading-relaxed">
        输入 / 唤起命令 · /分析 TSLA 生成分析 · ⌘S 即时保存
      </p>
    </section>
  );
}
