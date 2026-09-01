/**
 * Workspace Object Model — pure logic (#186)
 *
 * Object-first model for the `/workspace` shell:
 * - URL-stable object references (`note:<id>` / `pdf:<id>` / `inbox:<id>`)
 * - unified recent-object list across notes / PDFs / inbox
 * - command surface availability rules
 *
 * No React, no fetch — pure functions only so they stay unit-testable.
 */

import type { InboxItem } from "~/modules/inbox/use-inbox";
import type { NoteListItem } from "~/modules/notes/use-notes";
import type { PdfItem } from "~/modules/pdfs/use-pdfs";

// ── Object references ─────────────────────────────────────────────────────

export type WorkspaceObjectKind = "note" | "pdf" | "inbox";

export interface WorkspaceObjectRef {
  readonly kind: WorkspaceObjectKind;
  readonly id: string;
}

const KINDS: readonly WorkspaceObjectKind[] = ["note", "pdf", "inbox"];

function isKind(value: string): value is WorkspaceObjectKind {
  return (KINDS as readonly string[]).includes(value);
}

/**
 * Parse the `?object=` URL param. Accepts `kind:id` where the id may itself
 * contain colons (only the first colon is the separator). Returns null for
 * missing / malformed / empty values — never throws.
 */
export function parseObjectParam(
  value: string | null | undefined,
): WorkspaceObjectRef | null {
  if (!value) return null;
  const sep = value.indexOf(":");
  if (sep <= 0) return null;
  const kind = value.slice(0, sep);
  const id = value.slice(sep + 1);
  if (!isKind(kind) || id.length === 0) return null;
  return { kind, id };
}

export function formatObjectParam(ref: WorkspaceObjectRef): string {
  return `${ref.kind}:${ref.id}`;
}

export function objectHref(
  workspacePrefix: string,
  ref: WorkspaceObjectRef,
): string {
  return `${workspacePrefix}?object=${encodeURIComponent(formatObjectParam(ref))}`;
}

// ── Unified recent objects ────────────────────────────────────────────────

export interface WorkspaceObject {
  readonly kind: WorkspaceObjectKind;
  readonly id: string;
  readonly title: string;
  /** Secondary line: ticker / period / author / source — already honest. */
  readonly meta: string | null;
  readonly updatedAt: string;
}

export function buildWorkspaceObjects(input: {
  notes: readonly NoteListItem[] | null | undefined;
  pdfs: readonly PdfItem[] | null | undefined;
  inbox: readonly InboxItem[] | null | undefined;
}): WorkspaceObject[] {
  const objects: WorkspaceObject[] = [];

  for (const note of input.notes ?? []) {
    objects.push({
      kind: "note",
      id: note.id,
      title: note.title,
      meta: note.entityTicker ?? `${note.evidenceCount} evidence`,
      updatedAt: note.updatedAt,
    });
  }

  for (const pdf of input.pdfs ?? []) {
    objects.push({
      kind: "pdf",
      id: pdf.id,
      title: pdf.fileName,
      meta: pdf.ticker ?? pdf.reportPeriod ?? pdf.sourceLabel ?? null,
      updatedAt: pdf.updatedAt,
    });
  }

  for (const item of input.inbox ?? []) {
    if (item.status === "archived") continue;
    objects.push({
      kind: "inbox",
      id: item.id,
      title: item.title,
      meta: item.author ?? item.sourceType,
      updatedAt: item.updatedAt,
    });
  }

  return objects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Case-insensitive filter over title + meta. Empty query returns all. */
export function filterWorkspaceObjects(
  objects: readonly WorkspaceObject[],
  query: string,
): WorkspaceObject[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...objects];
  return objects.filter(
    (o) =>
      o.title.toLowerCase().includes(q) ||
      (o.meta ?? "").toLowerCase().includes(q),
  );
}

// ── Command surface ───────────────────────────────────────────────────────

export type WorkspaceCommandId =
  | "create-note"
  | "open-note"
  | "open-pdf"
  | "capture-inbox"
  | "insert-block";

export interface WorkspaceCommand {
  readonly id: WorkspaceCommandId;
  readonly title: string;
  readonly hint: string;
  readonly enabled: boolean;
  /** Present when enabled=false — shown instead of hiding the command. */
  readonly disabledReason?: string;
  /** Navigation commands carry their target; others are handled in-place. */
  readonly href?: string;
}

export function buildWorkspaceCommands(ctx: {
  noteActive: boolean;
  researchHref: string;
  pdfsHref: string;
}): WorkspaceCommand[] {
  return [
    {
      id: "create-note",
      title: "Create research note",
      hint: "Create a new note in the workspace",
      enabled: true,
      // #197: No href — handled locally by creating a note object.
    },
    {
      id: "open-note",
      title: "Search / open note",
      hint: "Jump to a note in the document canvas",
      enabled: true,
    },
    {
      id: "open-pdf",
      title: "Open PDF reader",
      hint: "Open a research PDF with annotations",
      enabled: true,
      href: ctx.pdfsHref,
    },
    {
      id: "capture-inbox",
      title: "Capture to inbox",
      hint: "Paste a URL or text snippet as evidence",
      enabled: true,
    },
    {
      id: "insert-block",
      title: "Insert evidence / live block",
      hint: "Attach inbox, PDF annotation, or evidence to the active note",
      enabled: ctx.noteActive,
      disabledReason: ctx.noteActive ? undefined : "Select a note first",
    },
  ];
}
