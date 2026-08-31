"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Workspace Canvas (#186) — the center pane of the `/workspace` shell.
 *
 * Selection is URL-stable: `?object=note:<id> | pdf:<id> | inbox:<id>`.
 * - none → object home: command surface + unified recents + capture/upload
 *   actions (all real product paths)
 * - note → document canvas (reuses NoteDetailView) with evidence state
 * - pdf → object panel: metadata, extraction status, annotations, reader link
 * - inbox → source panel with convert-to-note (real POST /convert)
 *
 * REDLINES:
 * - every dynamic title/ticker/source/date uses notranslate
 * - missing data renders as honest empty states / "—", never fabricated
 * - no export/publish write paths beyond the existing local Markdown export
 */
import {
  ArrowRight,
  FileText,
  Inbox,
  Loader2,
  NotebookPen,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";

import { Badge } from "@workspace/ui-web/badge";
import { Button } from "@workspace/ui-web/button";
import { Skeleton } from "@workspace/ui-web/skeleton";

import { pathsConfig } from "~/config/paths";
import { useInbox, useInboxMutations } from "~/modules/inbox/use-inbox";
import { NoteDetailView } from "~/modules/notes/note-detail-view";
import { useNote, useNotes } from "~/modules/notes/use-notes";
import { useAnnotations, usePdf, usePdfs } from "~/modules/pdfs/use-pdfs";
import { NoteBlockEditor } from "~/modules/workspace/note-block-editor";
import { WorkspaceCommandSurface } from "~/modules/workspace/workspace-command";
import {
  buildWorkspaceObjects,
  formatObjectParam,
  objectHref,
  parseObjectParam,
  type WorkspaceObject,
  type WorkspaceObjectRef,
} from "~/modules/workspace/workspace-object";

const ws = pathsConfig.dashboard.user.workspace;

const KIND_ICON = {
  note: NotebookPen,
  pdf: FileText,
  inbox: Inbox,
} as const;

// ── Shared bits ─────────────────────────────────────────────────────────────

function ObjectIcon({ kind }: { kind: WorkspaceObject["kind"] }) {
  const Icon = KIND_ICON[kind];
  return <Icon className="size-4 shrink-0" />;
}

function CanvasError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
      {message}
    </div>
  );
}

// ── Note canvas — document page ─────────────────────────────────────────────

function NoteCanvas({
  noteId,
  onDeleted,
}: {
  noteId: string;
  onDeleted: () => void;
}) {
  const noteQuery = useNote(noteId);

  if (noteQuery.isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (noteQuery.isError || !noteQuery.data) {
    return (
      <div className="p-4">
        <CanvasError
          message={
            noteQuery.error instanceof Error
              ? noteQuery.error.message
              : "Note failed to load"
          }
        />
      </div>
    );
  }

  const note = noteQuery.data;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      {/* Document canvas — the note reads as a page, not a detail panel.
          #188: the user-authored block editor sits above the immutable
          snapshot so the canvas is editable first, reference second. */}
      <div className="bg-card mx-auto max-w-3xl min-w-0 rounded-xl border p-4 sm:p-6">
        <div className="mx-auto w-full max-w-3xl min-w-0">
          <NoteBlockEditor note={note} onSaved={noteQuery.refetch} />
        </div>
        <div className="mt-8 border-t pt-6">
          <NoteDetailView
            note={note}
            refetch={noteQuery.refetch}
            onDeleted={onDeleted}
            showBackButton={false}
          />
        </div>
      </div>
    </div>
  );
}

// ── PDF canvas — object panel ───────────────────────────────────────────────

function PdfCanvas({ pdfId }: { pdfId: string }) {
  const pdfQuery = usePdf(pdfId);
  const annotationsQuery = useAnnotations(pdfId);

  if (pdfQuery.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  if (pdfQuery.isError || !pdfQuery.data) {
    return (
      <div className="p-6">
        <CanvasError
          message={
            pdfQuery.error instanceof Error
              ? pdfQuery.error.message
              : "PDF failed to load"
          }
        />
      </div>
    );
  }

  const pdf = pdfQuery.data;
  const annotations = annotationsQuery.data ?? [];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="bg-card mx-auto max-w-3xl space-y-4 rounded-xl border p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">PDF document</p>
            <h1
              className="notranslate mt-1 line-clamp-2 text-lg font-semibold"
              translate="no"
            >
              {pdf.fileName}
            </h1>
          </div>
          <Badge variant="outline" className="shrink-0">
            extraction: {pdf.extractionStatus}
          </Badge>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground text-xs">Ticker</dt>
            <dd className="notranslate mt-0.5 font-mono" translate="no">
              {pdf.ticker ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Report period</dt>
            <dd className="notranslate mt-0.5 font-mono" translate="no">
              {pdf.reportPeriod ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Source</dt>
            <dd className="notranslate mt-0.5" translate="no">
              {pdf.sourceLabel ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Pages</dt>
            <dd className="notranslate mt-0.5 font-mono" translate="no">
              {pdf.pageCount ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Annotations</dt>
            <dd className="notranslate mt-0.5 font-mono" translate="no">
              {annotationsQuery.isLoading ? "…" : annotations.length}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Added</dt>
            <dd className="notranslate mt-0.5 font-mono" translate="no">
              {pdf.createdAt.slice(0, 10)}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Link href={pathsConfig.dashboard.user.pdf(pdf.id)}>
            <Button size="sm">
              Open in reader
              <ArrowRight className="ml-1.5 size-3.5" />
            </Button>
          </Link>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Highlight or annotate in the reader, then insert the annotation into
            a note from the note inspector.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Inbox canvas — source panel with convert path ───────────────────────────

function InboxCanvas({
  itemId,
  onConverted,
  onArchived,
}: {
  itemId: string;
  onConverted: (noteId: string) => void;
  onArchived: () => void;
}) {
  const inboxQuery = useInbox();
  const mutations = useInboxMutations();

  if (inboxQuery.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  const item = (inboxQuery.data ?? []).find((i) => i.id === itemId);

  if (!item) {
    return (
      <div className="p-6">
        <CanvasError message="Inbox item not found — it may have been deleted." />
      </div>
    );
  }

  async function handleConvert() {
    try {
      const result = await mutations.convert.mutateAsync(item!.id);
      toast.success(
        result.alreadyConverted
          ? "Already converted — opening the note"
          : "Converted to a research note",
      );
      onConverted(result.noteId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Conversion failed");
    }
  }

  async function handleArchive() {
    try {
      await mutations.patch.mutateAsync({
        id: item!.id,
        input: { status: "archived" },
      });
      toast.success("Archived");
      onArchived();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Archive failed");
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="bg-card mx-auto max-w-3xl space-y-4 rounded-xl border p-4 sm:p-6">
        <div>
          <p className="text-muted-foreground text-xs">
            Inbox ·{" "}
            <span className="notranslate font-mono" translate="no">
              {item.sourceType}
            </span>
          </p>
          <h1
            className="notranslate mt-1 line-clamp-2 text-lg font-semibold"
            translate="no"
          >
            {item.title}
          </h1>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Author</dt>
            <dd className="notranslate mt-0.5" translate="no">
              {item.author ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Published</dt>
            <dd className="notranslate mt-0.5 font-mono" translate="no">
              {(item.publishedAt ?? item.createdAt).slice(0, 10)}
            </dd>
          </div>
        </dl>

        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="notranslate block font-mono text-sm break-all text-blue-600 hover:underline dark:text-blue-400"
            translate="no"
          >
            {item.url}
          </a>
        )}

        {item.rawText && (
          <blockquote
            className="notranslate text-muted-foreground border-l-2 pl-3 text-sm leading-relaxed"
            translate="no"
          >
            {item.rawText}
          </blockquote>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          {item.status === "converted" && item.noteId ? (
            <Link href={objectHref(ws, { kind: "note", id: item.noteId })}>
              <Button size="sm">
                Open converted note
                <ArrowRight className="ml-1.5 size-3.5" />
              </Button>
            </Link>
          ) : (
            <Button
              size="sm"
              onClick={handleConvert}
              disabled={mutations.convert.isPending}
            >
              {mutations.convert.isPending && (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              )}
              Convert to research note
            </Button>
          )}
          {item.status !== "archived" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleArchive}
              disabled={mutations.patch.isPending}
            >
              Archive
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Object home (no selection) ──────────────────────────────────────────────

function ObjectHome({
  objects,
  isLoading,
}: {
  objects: WorkspaceObject[];
  isLoading: boolean;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Research Workspace
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Source material → evidence → notes → export. One object at a time.
          </p>
        </div>

        <section>
          <p className="text-muted-foreground/60 mb-2 text-[11px] font-medium tracking-wider uppercase">
            Recent objects
          </p>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : objects.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <NotebookPen className="text-muted-foreground mx-auto size-7" />
              <p className="mt-3 text-sm font-medium">
                No research objects yet
              </p>
              <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-xs leading-relaxed">
                Capture a URL with ⌘K, upload a PDF, or generate a report in
                Research — everything lands here as a navigable object.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link href={pathsConfig.dashboard.user.research}>
                  <Button size="sm" variant="outline">
                    Generate a report
                  </Button>
                </Link>
                <Link href={pathsConfig.dashboard.user.pdfs}>
                  <Button size="sm" variant="outline">
                    Upload a PDF
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-border bg-card divide-y rounded-xl border">
              {objects.slice(0, 12).map((obj) => (
                <Link
                  key={`${obj.kind}-${obj.id}`}
                  href={objectHref(ws, obj)}
                  className="hover:bg-accent/50 flex items-center gap-3 px-3 py-2.5 transition-colors"
                >
                  <ObjectIcon kind={obj.kind} />
                  <div className="min-w-0 flex-1">
                    <p
                      className="notranslate line-clamp-1 text-sm font-medium"
                      translate="no"
                    >
                      {obj.title}
                    </p>
                    {obj.meta && (
                      <span
                        className="notranslate text-muted-foreground text-xs"
                        translate="no"
                      >
                        {obj.meta}
                      </span>
                    )}
                  </div>
                  <span
                    className="notranslate text-muted-foreground shrink-0 font-mono text-[10px]"
                    translate="no"
                  >
                    {obj.updatedAt.slice(0, 10)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ── Canvas root ─────────────────────────────────────────────────────────────

export function WorkspaceCanvas() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selection = parseObjectParam(searchParams.get("object"));

  const notesQuery = useNotes({});
  const pdfsQuery = usePdfs({});
  const inboxQuery = useInbox();

  const objects = useMemo(
    () =>
      buildWorkspaceObjects({
        notes: notesQuery.data,
        pdfs: pdfsQuery.data,
        inbox: inboxQuery.data,
      }),
    [notesQuery.data, pdfsQuery.data, inboxQuery.data],
  );

  function select(ref: WorkspaceObjectRef | null) {
    router.replace(
      ref
        ? `${pathname}?object=${encodeURIComponent(formatObjectParam(ref))}`
        : pathname,
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      {/* Canvas header — breadcrumb + command surface */}
      <div className="flex items-center gap-3 border-b px-4 py-2.5">
        {selection ? (
          <button
            type="button"
            onClick={() => select(null)}
            className="text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1.5 text-sm transition-colors"
          >
            <ObjectIcon kind={selection.kind} />
            <span className="capitalize">{selection.kind}</span> · back to all
            objects
          </button>
        ) : (
          <p className="text-muted-foreground shrink-0 text-sm">All objects</p>
        )}
        <div className="min-w-0 flex-1">
          <WorkspaceCommandSurface />
        </div>
      </div>

      {selection === null ? (
        <ObjectHome
          objects={objects}
          isLoading={
            notesQuery.isLoading || pdfsQuery.isLoading || inboxQuery.isLoading
          }
        />
      ) : selection.kind === "note" ? (
        <NoteCanvas noteId={selection.id} onDeleted={() => select(null)} />
      ) : selection.kind === "pdf" ? (
        <PdfCanvas pdfId={selection.id} />
      ) : (
        <InboxCanvas
          itemId={selection.id}
          onConverted={(noteId) => select({ kind: "note", id: noteId })}
          onArchived={() => select(null)}
        />
      )}
    </div>
  );
}
