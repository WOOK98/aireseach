"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Workspace Notes section (#197) — compact object list inside the
 * `/workspace` shell. Rows select the note in the canvas via `?object=`,
 * replacing the old standalone dashboard notes app (#170 shell).
 *
 * #197: When the API is unavailable, falls back to localStorage notes
 * and shows a degraded-mode banner instead of a dead-end alert.
 */
import { FileText, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@workspace/ui-web/button";
import { Input } from "@workspace/ui-web/input";
import { Skeleton } from "@workspace/ui-web/skeleton";

import { pathsConfig } from "~/config/paths";
import { createLocalNote } from "~/modules/notes/local-notes";
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

  function handleCreateNote() {
    const note = createLocalNote({
      title: "Untitled note",
    });
    // Navigate to the new note in the workspace canvas.
    window.location.href = objectHref(pathsConfig.workspace.index, {
      kind: "note",
      id: note.id,
    });
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 overflow-y-auto px-4 py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Notes</h1>
          <p className="text-muted-foreground text-sm">
            Select a note to open it in the workspace canvas.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={handleCreateNote}>
          <Plus className="size-3.5" />
          New note
        </Button>
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
        // #197: Not a dead end — show empty state with create action.
        // The localStorage fallback in useNotes should have returned
        // local notes. If we're here, both API and local failed.
        <div className="rounded-xl border border-dashed px-4 py-12 text-center">
          <FileText className="text-muted-foreground mx-auto h-8 w-8" />
          <p className="mt-3 text-sm font-medium">No research notes yet</p>
          <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-xs leading-relaxed">
            Create a note to start your research. Notes are saved locally and
            sync when the server is available.
          </p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={handleCreateNote}>
            <Plus className="size-3.5" />
            Create note
          </Button>
        </div>
      ) : notes.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-12 text-center">
          <FileText className="text-muted-foreground mx-auto h-8 w-8" />
          <p className="mt-3 text-sm font-medium">No research notes yet</p>
          <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-xs leading-relaxed">
            Paste a source into Inbox and convert it, or save an analysis from
            Research — notes land here as workspace objects.
          </p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={handleCreateNote}>
            <Plus className="size-3.5" />
            Create note
          </Button>
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
                {note.id.startsWith("local_") && (
                  <span className="shrink-0 rounded-full border border-blue-300 px-1.5 py-px text-[10px] text-blue-700 dark:border-blue-800 dark:text-blue-400">
                    local
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
