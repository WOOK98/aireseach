"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Workspace right inspector (#186) — contextual on the selected object.
 *
 * - no selection → workspace context / status / next actions (read-only)
 * - note selected → evidence state, live blocks, export, insert sources
 * - pdf selected → file metadata, extraction status, annotations, reader
 * - inbox selected → source metadata, convert-to-note / archive actions
 *
 * Object-specific sections reuse the existing hooks and the workspace
 * right rail insert flows — no new API surface, no publish/write paths.
 */
import {
  Activity,
  ArrowRight,
  Archive,
  BookOpen,
  CircleDot,
  CircleOff,
  FileText,
  Home,
  Inbox,
  Loader2,
  Map,
  NotebookPen,
  Send,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@workspace/ui-web/badge";
import { Button } from "@workspace/ui-web/button";
import { Skeleton } from "@workspace/ui-web/skeleton";

import { pathsConfig } from "~/config/paths";
import { useInbox, useInboxMutations } from "~/modules/inbox/use-inbox";
import { NoteExportMenu } from "~/modules/notes/note-export-menu";
import { useNote } from "~/modules/notes/use-notes";
import { WorkspaceRightRail } from "~/modules/notes/workspace-right-rail";
import { useAnnotations, usePdf } from "~/modules/pdfs/use-pdfs";
import { NotePublishPreview } from "~/modules/workspace/note-publish-preview";
import { INSERT_RAIL_ELEMENT_ID } from "~/modules/workspace/workspace-command";
import {
  formatObjectParam,
  objectHref,
  parseObjectParam,
} from "~/modules/workspace/workspace-object";

const ws = pathsConfig.workspace.index;

interface InspectorContext {
  readonly key: string;
  readonly title: string;
  readonly icon: React.ReactNode;
  readonly description: string;
  readonly nextActions: readonly string[];
  readonly links: readonly { label: string; href: string }[];
}

const CONTEXTS: readonly InspectorContext[] = [
  {
    key: "home",
    title: "Workspace Home",
    icon: <Home className="h-4 w-4" />,
    description:
      "Unified view over your research objects. Recents aggregate from existing sources — no mock data.",
    nextActions: [
      "Capture evidence in Inbox",
      "Generate a report in Research to create notes",
      "Review conviction tiers in Companies",
    ],
    links: [
      { label: "Notes", href: pathsConfig.workspace.notes },
      { label: "Inbox", href: pathsConfig.workspace.inbox },
      { label: "Research", href: pathsConfig.dashboard.user.research },
    ],
  },
  {
    key: "notes",
    title: "Notes",
    icon: <NotebookPen className="h-4 w-4" />,
    description:
      "Research notes with evidence counts. Live — backed by the existing notes workspace.",
    nextActions: ["Open the three-column notes workspace", "Edit a note"],
    links: [{ label: "Notes", href: pathsConfig.workspace.notes }],
  },
  {
    key: "inbox",
    title: "Inbox",
    icon: <Inbox className="h-4 w-4" />,
    description:
      "Collect evidence from URLs, text, or posts. Live — backed by the existing inbox.",
    nextActions: ["Paste a URL or text snippet", "Triage captured evidence"],
    links: [{ label: "Inbox", href: pathsConfig.workspace.inbox }],
  },
  {
    key: "pdfs",
    title: "PDFs",
    icon: <FileText className="h-4 w-4" />,
    description:
      "Upload and annotate research PDFs. Live — backed by the existing PDF reader.",
    nextActions: ["Upload a PDF", "Annotate a document"],
    links: [{ label: "PDFs", href: pathsConfig.workspace.pdfs }],
  },
  {
    key: "watchlist",
    title: "Companies",
    icon: <Activity className="h-4 w-4" />,
    description:
      "Conviction tiers and invalidation conditions. Live — backed by the existing watchlist.",
    nextActions: ["Review tier changes", "Check invalidation conditions"],
    links: [{ label: "Watchlist", href: pathsConfig.workspace.watchlist }],
  },
  {
    key: "atlas",
    title: "Industries",
    icon: <Map className="h-4 w-4" />,
    description:
      "Industry and data atlas views. Live — backed by the existing visuals surface.",
    nextActions: ["Explore industry maps", "Review data coverage"],
    links: [{ label: "Visuals", href: pathsConfig.dashboard.user.visuals }],
  },
];

const LIVE_VIEWS = [
  "Home",
  "Notes",
  "Inbox",
  "PDFs",
  "Companies",
  "Industries",
];
const DISABLED_VIEWS = ["Evidence", "Exports"];

const HOME_CONTEXT = CONTEXTS[0] as InspectorContext;

function resolveContext(pathname: string): InspectorContext {
  const match = CONTEXTS.find(
    (c) => c.key !== "home" && pathname.startsWith(`${ws}/${c.key}`),
  );
  return match ?? HOME_CONTEXT;
}

function InspectorSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="text-muted-foreground/60 mb-1.5 px-1 text-[11px] font-medium tracking-wider uppercase">
        {title}
      </p>
      {children}
    </section>
  );
}

function InspectorShell({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex items-center gap-2 border-b px-4 py-3">
        {icon}
        <span
          className="notranslate line-clamp-1 text-sm font-semibold tracking-tight"
          translate="no"
        >
          {title}
        </span>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {children}
      </div>
    </>
  );
}

// ── Note inspector ──────────────────────────────────────────────────────────

function NoteInspector({ noteId }: { noteId: string }) {
  const noteQuery = useNote(noteId);

  if (noteQuery.isLoading) {
    return (
      <InspectorShell icon={<NotebookPen className="h-4 w-4" />} title="Note">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </InspectorShell>
    );
  }

  if (noteQuery.isError || !noteQuery.data) {
    return (
      <InspectorShell icon={<NotebookPen className="h-4 w-4" />} title="Note">
        <p className="text-muted-foreground px-1 text-xs">
          {noteQuery.error instanceof Error
            ? noteQuery.error.message
            : "Note unavailable."}
        </p>
      </InspectorShell>
    );
  }

  const note = noteQuery.data;
  const liveBlocks = note.liveBlocks ?? [];

  return (
    <InspectorShell
      icon={<NotebookPen className="h-4 w-4" />}
      title={note.title}
    >
      <InspectorSection title="Evidence state">
        <div className="space-y-1.5 px-1 text-xs">
          <p className="text-muted-foreground">
            <span className="notranslate font-mono" translate="no">
              {note.evidenceCount}
            </span>{" "}
            evidence · as of{" "}
            <span className="notranslate font-mono" translate="no">
              {note.asOf}
            </span>
          </p>
          <p className="text-muted-foreground">
            <span className="notranslate font-mono" translate="no">
              {liveBlocks.length}
            </span>{" "}
            live block{liveBlocks.length === 1 ? "" : "s"}
            {note.entityTicker && (
              <>
                {" "}
                ·{" "}
                <span className="notranslate font-mono" translate="no">
                  {note.entityTicker}
                </span>
              </>
            )}
          </p>
        </div>
      </InspectorSection>

      <InspectorSection title="Export">
        <div className="flex flex-wrap items-center gap-2 px-1">
          <NoteExportMenu note={note} />
          <NotePublishPreview note={note} />
        </div>
      </InspectorSection>

      <InspectorSection title="Insert into note">
        <div id={INSERT_RAIL_ELEMENT_ID} className="scroll-mt-4">
          <WorkspaceRightRail
            noteId={note.id}
            note={note}
            onInserted={noteQuery.refetch}
          />
        </div>
      </InspectorSection>
    </InspectorShell>
  );
}

// ── PDF inspector ───────────────────────────────────────────────────────────

function PdfInspector({ pdfId }: { pdfId: string }) {
  const pdfQuery = usePdf(pdfId);
  const annotationsQuery = useAnnotations(pdfId);

  if (pdfQuery.isLoading) {
    return (
      <InspectorShell icon={<FileText className="h-4 w-4" />} title="PDF">
        <Skeleton className="h-24 rounded-lg" />
      </InspectorShell>
    );
  }

  if (pdfQuery.isError || !pdfQuery.data) {
    return (
      <InspectorShell icon={<FileText className="h-4 w-4" />} title="PDF">
        <p className="text-muted-foreground px-1 text-xs">
          {pdfQuery.error instanceof Error
            ? pdfQuery.error.message
            : "PDF unavailable."}
        </p>
      </InspectorShell>
    );
  }

  const pdf = pdfQuery.data;

  return (
    <InspectorShell
      icon={<FileText className="h-4 w-4" />}
      title={pdf.fileName}
    >
      <InspectorSection title="File">
        <div className="space-y-1.5 px-1 text-xs">
          <p className="text-muted-foreground">
            Ticker{" "}
            <span className="notranslate font-mono" translate="no">
              {pdf.ticker ?? "—"}
            </span>{" "}
            · period{" "}
            <span className="notranslate font-mono" translate="no">
              {pdf.reportPeriod ?? "—"}
            </span>
          </p>
          <p className="text-muted-foreground">
            Source{" "}
            <span className="notranslate" translate="no">
              {pdf.sourceLabel ?? "—"}
            </span>
          </p>
          <p className="text-muted-foreground">
            <span className="notranslate font-mono" translate="no">
              {pdf.pageCount ?? "—"}
            </span>{" "}
            pages · added{" "}
            <span className="notranslate font-mono" translate="no">
              {pdf.createdAt.slice(0, 10)}
            </span>
          </p>
        </div>
      </InspectorSection>

      <InspectorSection title="Extraction">
        <div className="px-1">
          <Badge variant="outline">{pdf.extractionStatus}</Badge>
          <p className="text-muted-foreground mt-1.5 text-[11px] leading-relaxed">
            {pdf.extractionStatus === "failed"
              ? "Full-text extraction failed — reading still works."
              : pdf.extractionStatus === "pending"
                ? "Extraction pending — run it from the reader if needed."
                : "Full text available for evidence conversion."}
          </p>
        </div>
      </InspectorSection>

      <InspectorSection title="Annotations">
        <p className="text-muted-foreground px-1 text-xs">
          <span className="notranslate font-mono" translate="no">
            {annotationsQuery.isLoading
              ? "…"
              : (annotationsQuery.data ?? []).length}
          </span>{" "}
          annotation{(annotationsQuery.data ?? []).length === 1 ? "" : "s"} —
          convertible to evidence from the reader.
        </p>
      </InspectorSection>

      <InspectorSection title="Actions">
        <div className="px-1">
          <Link href={pathsConfig.dashboard.user.pdf(pdf.id)}>
            <Button size="sm" variant="outline" className="w-full">
              Open in reader
              <ArrowRight className="ml-1.5 size-3.5" />
            </Button>
          </Link>
        </div>
      </InspectorSection>
    </InspectorShell>
  );
}

// ── Inbox inspector ─────────────────────────────────────────────────────────

function InboxInspector({
  itemId,
  onConverted,
}: {
  itemId: string;
  onConverted: (noteId: string) => void;
}) {
  const inboxQuery = useInbox();
  const mutations = useInboxMutations();
  const [busy, setBusy] = useState(false);

  const item = (inboxQuery.data ?? []).find((i) => i.id === itemId);

  if (inboxQuery.isLoading) {
    return (
      <InspectorShell icon={<Inbox className="h-4 w-4" />} title="Inbox">
        <Skeleton className="h-24 rounded-lg" />
      </InspectorShell>
    );
  }

  if (!item) {
    return (
      <InspectorShell icon={<Inbox className="h-4 w-4" />} title="Inbox">
        <p className="text-muted-foreground px-1 text-xs">
          Inbox item not found — it may have been deleted.
        </p>
      </InspectorShell>
    );
  }

  async function handleConvert() {
    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  }

  return (
    <InspectorShell icon={<Inbox className="h-4 w-4" />} title={item.title}>
      <InspectorSection title="Source">
        <div className="space-y-1.5 px-1 text-xs">
          <p className="text-muted-foreground">
            Type{" "}
            <span className="notranslate font-mono" translate="no">
              {item.sourceType}
            </span>{" "}
            · status{" "}
            <span className="notranslate font-mono" translate="no">
              {item.status}
            </span>
          </p>
          <p className="text-muted-foreground">
            Author{" "}
            <span className="notranslate" translate="no">
              {item.author ?? "—"}
            </span>
          </p>
          <p className="text-muted-foreground">
            Captured{" "}
            <span className="notranslate font-mono" translate="no">
              {item.createdAt.slice(0, 10)}
            </span>
          </p>
        </div>
      </InspectorSection>

      <InspectorSection title="Actions">
        <div className="space-y-2 px-1">
          {item.status === "converted" && item.noteId ? (
            <Link href={objectHref(ws, { kind: "note", id: item.noteId })}>
              <Button size="sm" variant="outline" className="w-full">
                Open converted note
                <ArrowRight className="ml-1.5 size-3.5" />
              </Button>
            </Link>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleConvert}
              disabled={busy}
            >
              {busy && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Convert to research note
            </Button>
          )}
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Conversion creates a draft note you can edit and attach evidence to.
          </p>
        </div>
      </InspectorSection>
    </InspectorShell>
  );
}

// ── Generic context (no selection) ─────────────────────────────────────────

function GenericInspector({ pathname }: { pathname: string }) {
  const context = resolveContext(pathname);

  return (
    <InspectorShell icon={context.icon} title={context.title}>
      <InspectorSection title="Context">
        <p className="text-muted-foreground px-1 text-xs leading-relaxed">
          {context.description}
        </p>
      </InspectorSection>

      <InspectorSection title="Status">
        <ul className="space-y-1 px-1">
          {LIVE_VIEWS.map((view) => (
            <li
              key={view}
              className="text-muted-foreground flex items-center gap-2 text-xs"
            >
              <CircleDot className="h-3 w-3 text-emerald-500" />
              <span>{view}</span>
              <span className="text-muted-foreground/50">live</span>
            </li>
          ))}
          {DISABLED_VIEWS.map((view) => (
            <li
              key={view}
              className="text-muted-foreground/50 flex items-center gap-2 text-xs"
            >
              <CircleOff className="h-3 w-3" />
              <span>{view}</span>
              <span>coming in next cut</span>
            </li>
          ))}
        </ul>
      </InspectorSection>

      <InspectorSection title="Next actions">
        <ul className="space-y-1.5 px-1">
          {context.nextActions.map((action) => (
            <li
              key={action}
              className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed"
            >
              <ArrowRight className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </InspectorSection>

      <InspectorSection title="Linked views">
        <div className="space-y-0.5 px-1">
          {context.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:bg-accent/50 hover:text-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors"
            >
              <BookOpen className="h-3 w-3" />
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      </InspectorSection>

      <InspectorSection title="Placeholders">
        <div className="space-y-1 px-1">
          <div className="text-muted-foreground/50 flex cursor-not-allowed items-center gap-2 px-2 py-1.5 text-xs">
            <Archive className="h-3 w-3" />
            <span>Evidence explorer — disabled</span>
          </div>
          <div className="text-muted-foreground/50 flex cursor-not-allowed items-center gap-2 px-2 py-1.5 text-xs">
            <Send className="h-3 w-3" />
            <span>Exports — disabled</span>
          </div>
          <p className="text-muted-foreground/40 px-2 text-[11px] leading-relaxed">
            Placeholders are read-only and non-executable.
          </p>
        </div>
      </InspectorSection>
    </InspectorShell>
  );
}

// ── Root ────────────────────────────────────────────────────────────────────

export function WorkspaceInspector() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selection = parseObjectParam(searchParams.get("object"));

  function goToNote(noteId: string) {
    router.replace(
      `${pathname}?object=${encodeURIComponent(formatObjectParam({ kind: "note", id: noteId }))}`,
    );
  }

  let body: React.ReactNode;
  if (selection === null) {
    body = <GenericInspector pathname={pathname} />;
  } else if (selection.kind === "note") {
    body = <NoteInspector noteId={selection.id} />;
  } else if (selection.kind === "pdf") {
    body = <PdfInspector pdfId={selection.id} />;
  } else {
    body = <InboxInspector itemId={selection.id} onConverted={goToNote} />;
  }

  return (
    <aside className="bg-card hidden h-full w-64 flex-col border-l lg:flex xl:w-72">
      {body}
      {selection === null && (
        <div className="border-t px-4 py-2">
          <p className="text-muted-foreground/50 text-[11px]">
            Select an object for contextual actions.
          </p>
        </div>
      )}
    </aside>
  );
}
