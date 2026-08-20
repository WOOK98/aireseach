"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Research Notes workbench — list view (#154)
 *
 * Recent notes + ticker filter + search. List items never include the
 * artifact payload (kept light); click through to the detail page.
 */
import { FileText, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@workspace/ui-web/button";
import { Input } from "@workspace/ui-web/input";
import { Skeleton } from "@workspace/ui-web/skeleton";

import { useNotes } from "~/modules/notes/use-notes";

function NotesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-xl border p-4">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NotesPage() {
  const [search, setSearch] = useState("");
  const [ticker, setTicker] = useState<string | null>(null);

  const notesQuery = useNotes({
    q: search.trim() || undefined,
    ticker: ticker ?? undefined,
  });

  // Derive ticker filters from the unfiltered note set (stable facet list).
  const allNotes = useNotes({});
  const tickers = useMemo(() => {
    const set = new Set<string>();
    for (const n of allNotes.data ?? []) {
      if (n.entityTicker) set.add(n.entityTicker);
    }
    return Array.from(set).sort();
  }, [allNotes.data]);

  const notes = notesQuery.data ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">研究笔记</h1>
        <p className="text-muted-foreground text-sm">
          保存的研报快照 — 内容按保存时的 as-of 数据渲染，不混入新数据。
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题 / 摘要 / 公司名..."
            className="pl-9"
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

      {notesQuery.isLoading ? (
        <NotesSkeleton />
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
        <div className="rounded-xl border border-dashed px-4 py-16 text-center">
          <FileText className="text-muted-foreground mx-auto h-8 w-8" />
          <p className="mt-3 text-sm font-medium">还没有研究笔记</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            在 Research 页生成研报文章后，点击「保存为笔记」即可在这里重开。
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <Link
              key={n.id}
              href={`/dashboard/notes/${n.id}`}
              className="hover:border-primary/40 block rounded-xl border p-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className="notranslate truncate text-sm font-semibold"
                    translate="no"
                  >
                    {n.title}
                  </p>
                  {n.summary && (
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
                      {n.summary}
                    </p>
                  )}
                </div>
                <span
                  className="text-muted-foreground notranslate shrink-0 font-mono text-[10px]"
                  translate="no"
                >
                  as of {n.asOf}
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {n.entityTicker && (
                  <span
                    className="notranslate rounded-full border px-2 py-0.5 font-mono text-[10px]"
                    translate="no"
                  >
                    {n.entityTicker}
                  </span>
                )}
                {n.tags.map((tag) => (
                  <span
                    key={tag}
                    className="notranslate bg-muted rounded-full px-2 py-0.5 text-[10px]"
                    translate="no"
                  >
                    {tag}
                  </span>
                ))}
                <span className="text-muted-foreground ml-auto text-[10px]">
                  {n.evidenceCount} 条证据 ·{" "}
                  {new Date(n.createdAt).toLocaleDateString("zh-CN")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
