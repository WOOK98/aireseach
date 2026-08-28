"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Workspace Home — unified recent objects across research workspace.
 *
 * Shows recent notes, inbox items, PDFs, and watchlist signals.
 * Uses existing hooks; honest empty states when data unavailable.
 */
import { Activity, BookOpen, FileText, Inbox, NotebookPen } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { Skeleton } from "@workspace/ui-web/skeleton";

import { pathsConfig } from "~/config/paths";
import { useNotes } from "~/modules/notes/use-notes";

const ws = pathsConfig.dashboard.user.workspace;

function RecentSection({
  title,
  icon,
  href,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  href: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-semibold">{title}</h2>
          {count !== undefined && (
            <span className="text-muted-foreground text-xs">{count}</span>
          )}
        </div>
        <Link
          href={href}
          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
        >
          View all →
        </Link>
      </div>
      {children}
    </section>
  );
}

export default function WorkspaceHomePage() {
  const notesQuery = useNotes({});
  const recentNotes = useMemo(
    () => (notesQuery.data ?? []).slice(0, 5),
    [notesQuery.data],
  );
  const noteCount = notesQuery.data?.length ?? 0;

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="text-primary h-6 w-6" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Research Workspace
            </h1>
            <p className="text-muted-foreground text-sm">
              Your research objects in one place
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <RecentSection
          title="Notes"
          icon={<NotebookPen className="h-4 w-4" />}
          href={`${ws}/notes`}
          count={noteCount}
        >
          {notesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 rounded-lg" />
              ))}
            </div>
          ) : recentNotes.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-xs">
              No notes yet — generate a report in Research to get started
            </p>
          ) : (
            <div className="space-y-1.5">
              {recentNotes.map((n) => (
                <Link
                  key={n.id}
                  href={pathsConfig.dashboard.user.note(n.id)}
                  className="hover:bg-accent/50 block rounded-lg border px-3 py-2 text-sm transition-colors"
                >
                  <p className="line-clamp-1 font-medium">{n.title}</p>
                  <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                    {n.entityTicker && (
                      <span className="notranslate font-mono" translate="no">
                        {n.entityTicker}
                      </span>
                    )}
                    <span>{n.evidenceCount} evidence</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </RecentSection>

        <RecentSection
          title="Inbox"
          icon={<Inbox className="h-4 w-4" />}
          href={`${ws}/inbox`}
        >
          <p className="text-muted-foreground py-4 text-center text-xs">
            Paste URLs, text, or X posts to collect evidence
          </p>
        </RecentSection>

        <RecentSection
          title="PDFs"
          icon={<FileText className="h-4 w-4" />}
          href={`${ws}/pdfs`}
        >
          <p className="text-muted-foreground py-4 text-center text-xs">
            Upload and annotate research PDFs
          </p>
        </RecentSection>

        <RecentSection
          title="Watchlist"
          icon={<Activity className="h-4 w-4" />}
          href={`${ws}/watchlist`}
        >
          <p className="text-muted-foreground py-4 text-center text-xs">
            Track conviction tiers and invalidation conditions
          </p>
        </RecentSection>

        <section className="bg-card/50 rounded-xl border p-4 opacity-50">
          <div className="mb-3 flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            <h2 className="text-sm font-semibold">Evidence</h2>
          </div>
          <p className="text-muted-foreground py-4 text-center text-xs">
            Coming in next cut — unified evidence explorer
          </p>
        </section>

        <section className="bg-card/50 rounded-xl border p-4 opacity-50">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <h2 className="text-sm font-semibold">Exports</h2>
          </div>
          <p className="text-muted-foreground py-4 text-center text-xs">
            Coming in next cut — publish / export management
          </p>
        </section>
      </div>
    </div>
  );
}
