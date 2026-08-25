"use client";

/* oxlint-disable i18next/no-literal-string */

import { useQueryClient } from "@tanstack/react-query";
/**
 * Research Workspace Shell — list page (#170)
 *
 * Three-column workspace:
 *   left  — notes list with search / ticker filter
 *   center — selected note detail (NoteDetailView)
 *   right  — insert sources (inbox / PDF / live evidence)
 *
 * On mobile: list → note (back button) → rail stacked vertically.
 *
 * Acceptance:
 * - selecting a note renders the note body + block-style evidence/live/PDF
 *   sections
 * - inserting from the right rail persists and survives refresh
 * - old notes without liveBlocks degrade safely (no 500)
 * - no export / public sharing / X write path
 */
import { FileText, Inbox } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@workspace/ui-web/button";
import { Input } from "@workspace/ui-web/input";
import { Skeleton } from "@workspace/ui-web/skeleton";

import { pathsConfig } from "~/config/paths";
import { NoteDetailView } from "~/modules/notes/note-detail-view";
import { useNote, useNotes } from "~/modules/notes/use-notes";
import { WorkspaceRightRail } from "~/modules/notes/workspace-right-rail";

import type { NoteListItem } from "~/modules/notes/use-notes";

// ── Notes list item ─────────────────────────────────────────────────────────

function NotesListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-1.5 rounded-xl border p-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

function NoteListItem({
  note,
  selected,
  onSelect,
}: {
  note: NoteListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-3 text-left transition-colors ${
        selected ? "border-primary bg-primary/5" : "hover:border-primary/40"
      }`}
    >
      <p
        className="notranslate line-clamp-1 text-sm font-medium"
        translate="no"
      >
        {note.title}
      </p>
      {note.kind === "draft" && (
        <span className="mt-0.5 inline-block rounded-full border border-amber-300 px-1.5 py-px text-[10px] text-amber-700 dark:border-amber-800 dark:text-amber-400">
          草稿
        </span>
      )}
      {note.summary && (
        <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
          {note.summary}
        </p>
      )}
      <div className="mt-1.5 flex items-center gap-1.5">
        {note.entityTicker && (
          <span
            className="notranslate rounded-full border px-1.5 py-px font-mono text-[10px]"
            translate="no"
          >
            {note.entityTicker}
          </span>
        )}
        <span className="text-muted-foreground ml-auto text-[10px]">
          {note.evidenceCount} 条证据 ·{" "}
          <span className="notranslate" translate="no">
            {note.asOf}
          </span>
        </span>
      </div>
    </button>
  );
}

// ── Workspace shell ─────────────────────────────────────────────────────────

export default function NotesWorkspacePage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [ticker, setTicker] = useState<string | null>(null);

  const notesQuery = useNotes({
    q: search.trim() || undefined,
    ticker: ticker ?? undefined,
  });

  // Ticker facets from the unfiltered note set (stable facet list).
  const allNotes = useNotes({});
  const tickers = useMemo(() => {
    const set = new Set<string>();
    for (const n of allNotes.data ?? []) {
      if (n.entityTicker) set.add(n.entityTicker);
    }
    return Array.from(set).sort();
  }, [allNotes.data]);

  const notes = notesQuery.data ?? [];

  // Detail for the selected note (enabled: id.length > 0 per hook).
  const noteQuery = useNote(selectedId ?? "");

  async function handleRefetch() {
    await Promise.all([
      noteQuery.refetch(),
      qc.invalidateQueries({ queryKey: ["research-notes"] }),
    ]);
  }

  function handleDeleted() {
    setSelectedId(null);
    void qc.invalidateQueries({ queryKey: ["research-notes"] });
  }

  const hasSelection = Boolean(selectedId && noteQuery.data);

  return (
    <div className="flex h-full flex-col px-4 py-6">
      {/* ── Header ── */}
      <div className="mb-4 space-y-1">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">研究工作台</h1>
          <Link
            href={pathsConfig.dashboard.user.inbox}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
          >
            <Inbox className="h-3.5 w-3.5" />
            Inbox
          </Link>
          <Link
            href={pathsConfig.dashboard.user.pdfs}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            PDF 文档
          </Link>
        </div>
        <p className="text-muted-foreground text-sm">
          选择笔记 → 编辑内容 → 从右侧插入证据 / PDF 批注 / Live Block
        </p>
      </div>

      {/* ── Search + ticker filters ── */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题 / 摘要 / 公司名..."
          />
        </div>
        {tickers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant={ticker === null ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setTicker(null)}
            >
              全部
            </Button>
            {tickers.map((t) => (
              <Button
                key={t}
                variant={ticker === t ? "default" : "outline"}
                size="sm"
                className="notranslate h-7 font-mono text-xs"
                translate="no"
                onClick={() => setTicker(ticker === t ? null : t)}
              >
                {t}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* ── Three-column workspace ── */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        {/* ── Left rail: notes list ── */}
        <div
          className={`overflow-y-auto ${hasSelection ? "hidden lg:block" : ""}`}
        >
          {notesQuery.isLoading ? (
            <NotesListSkeleton />
          ) : notesQuery.isError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center dark:border-amber-900/60 dark:bg-amber-950/30">
              <p className="text-sm font-medium">笔记加载失败</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {notesQuery.error instanceof Error
                  ? notesQuery.error.message
                  : "请稍后重试"}
              </p>
            </div>
          ) : notes.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-12 text-center">
              <FileText className="text-muted-foreground mx-auto h-8 w-8" />
              <p className="mt-3 text-sm font-medium">还没有研究笔记</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                在 Research 页生成研报文章后，点击「保存为笔记」即可在这里重开。
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map((n) => (
                <NoteListItem
                  key={n.id}
                  note={n}
                  selected={selectedId === n.id}
                  onSelect={() => setSelectedId(n.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Center: selected note detail ── */}
        <div
          className={`min-h-0 overflow-y-auto ${
            hasSelection ? "" : "hidden lg:block"
          }`}
        >
          {!selectedId ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed p-8">
              <p className="text-muted-foreground text-sm">
                在左侧选择一篇笔记开始工作
              </p>
            </div>
          ) : noteQuery.isLoading ? (
            <div className="space-y-4 p-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-64 rounded-lg" />
            </div>
          ) : noteQuery.isError || !noteQuery.data ? (
            <div className="p-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                {noteQuery.error instanceof Error
                  ? noteQuery.error.message
                  : "笔记加载失败"}
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="mt-3 text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                ← 返回列表
              </button>
            </div>
          ) : (
            <>
              {/* Mobile: back button */}
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm lg:hidden"
              >
                ← 返回列表
              </button>
              <NoteDetailView
                note={noteQuery.data}
                refetch={handleRefetch}
                onDeleted={handleDeleted}
                showBackButton={false}
              />
            </>
          )}
        </div>

        {/* ── Right rail: insert sources ── */}
        <div className={hasSelection ? "" : "hidden lg:block"}>
          <WorkspaceRightRail
            noteId={selectedId}
            note={noteQuery.data ?? null}
            onInserted={handleRefetch}
          />
        </div>
      </div>
    </div>
  );
}
