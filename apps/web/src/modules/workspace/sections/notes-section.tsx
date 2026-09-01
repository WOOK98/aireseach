"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Workspace Notes section (#197) — compact object list inside the
 * `/workspace` shell. Rows select the note in the canvas via `?object=`,
 * replacing the old standalone dashboard notes app (#170 shell).
 */
import { FileText, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@workspace/ui-web/button";
import { Input } from "@workspace/ui-web/input";
import { Skeleton } from "@workspace/ui-web/skeleton";

import { pathsConfig } from "~/config/paths";
import { useNotes } from "~/modules/notes/use-notes";
import { objectHref } from "~/modules/workspace/workspace-object";

function NotesSectionSkeleton() {
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

export function NotesSection() {
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

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 overflow-y-auto px-4 py-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Notes</h1>
        <p className="text-muted-foreground text-sm">
          Select a note to open it in the workspace canvas.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title / summary / company..."
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
              All
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
        <NotesSectionSkeleton />
      ) : notesQuery.isError ? (
        <div className="text-destructive rounded-xl border p-6 text-sm">
          Notes are temporarily unavailable — please try again shortly.
        </div>
      ) : notes.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-12 text-center">
          <FileText className="text-muted-foreground mx-auto h-8 w-8" />
          <p className="mt-3 text-sm font-medium">No research notes yet</p>
          <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-xs leading-relaxed">
            Paste a source into Inbox and convert it, or save an analysis from
            Research — notes land here as workspace objects.
          </p>
        </div>
      ) : (
        <div className="divide-border bg-card divide-y rounded-xl border">
          {notes.map((note) => (
            <Link
              key={note.id}
              href={objectHref(pathsConfig.workspace.index, {
                kind: "note",
                id: note.id,
              })}
              className="hover:bg-accent/50 block px-4 py-3 transition-colors"
            >
              <div className="flex items-center gap-2">
                <p
                  className="notranslate line-clamp-1 min-w-0 flex-1 text-sm font-medium"
                  translate="no"
                >
                  {note.title}
                </p>
                {note.kind === "draft" && (
                  <span className="shrink-0 rounded-full border border-amber-300 px-1.5 py-px text-[10px] text-amber-700 dark:border-amber-800 dark:text-amber-400">
                    draft
                  </span>
                )}
                <span
                  className="notranslate text-muted-foreground shrink-0 font-mono text-[10px]"
                  translate="no"
                >
                  {note.asOf}
                </span>
              </div>
              {note.summary && (
                <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                  {note.summary}
                </p>
              )}
              {note.entityTicker && (
                <span
                  className="notranslate mt-1 inline-block rounded-full border px-1.5 py-px font-mono text-[10px]"
                  translate="no"
                >
                  {note.entityTicker}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
