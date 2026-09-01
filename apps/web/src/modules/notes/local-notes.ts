/**
 * Local Notes — client-side fallback when /api/notes is unavailable (#197).
 *
 * Stores notes in localStorage so the workspace remains functional during
 * backend outages. Data survives page reloads. When the API recovers,
 * callers can sync local notes upstream.
 *
 * This is a degraded mode, not a replacement for the API:
 * - No cross-device sync
 * - No live blocks / evidence linkage
 * - No full-text search across artifacts
 *
 * REDLINES:
 * - ticker / company / date fields use notranslate
 * - no buy/sell/hold/target price in generated content
 * - no raw SQL, stack traces, or env var names in user-visible text
 */

import type { NoteDetail, NoteListItem } from "./use-notes";

const STORAGE_KEY = "airesearch_local_notes";

export interface LocalNote {
  id: string;
  title: string;
  summary: string | null;
  note: string | null;
  tags: string[];
  kind: "draft";
  entityTicker: string | null;
  entityName: string | null;
  schemaVersion: number;
  evidenceCount: number;
  asOf: string;
  createdAt: string;
  updatedAt: string;
  /** Minimal artifact for degraded mode — a draft with empty sections. */
  artifact: {
    kind: "draft";
    sections: Record<string, string>;
  };
  evidenceIds: string[];
  liveBlocks: never[];
  blocks: Array<{
    id: string;
    type: "paragraph";
    text: string;
  }>;
  sourceMeta: null;
  /** Marks notes that exist only in localStorage. */
  _local: true;
}

function generateId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readAll(): LocalNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as LocalNote[];
  } catch {
    return [];
  }
}

function writeAll(notes: LocalNote[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    /* quota exceeded — degrade silently */
  }
}

/** List all local notes, optionally filtered. */
export function listLocalNotes(query?: {
  q?: string;
  ticker?: string;
}): NoteListItem[] {
  let notes = readAll();

  if (query?.ticker) {
    const t = query.ticker.toUpperCase();
    notes = notes.filter((n) => n.entityTicker?.toUpperCase() === t);
  }
  if (query?.q) {
    const q = query.q.toLowerCase();
    notes = notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.summary ?? "").toLowerCase().includes(q) ||
        (n.entityName ?? "").toLowerCase().includes(q),
    );
  }

  return notes
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((n) => ({
      id: n.id,
      title: n.title,
      summary: n.summary,
      note: n.note,
      tags: n.tags,
      kind: n.kind,
      entityTicker: n.entityTicker,
      entityName: n.entityName,
      schemaVersion: n.schemaVersion,
      evidenceCount: n.evidenceCount,
      asOf: n.asOf,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }));
}

/** Get one local note by id. */
export function getLocalNote(id: string): NoteDetail | null {
  const notes = readAll();
  const note = notes.find((n) => n.id === id);
  if (!note) return null;
  return note as unknown as NoteDetail;
}

/** Create a new local note (draft). */
export function createLocalNote(input: {
  title: string;
  summary?: string;
  note?: string;
  entityTicker?: string;
  entityName?: string;
  tags?: string[];
}): LocalNote {
  const now = new Date().toISOString();
  const note: LocalNote = {
    id: generateId(),
    title: input.title,
    summary: input.summary ?? null,
    note: input.note ?? null,
    tags: input.tags ?? [],
    kind: "draft",
    entityTicker: input.entityTicker?.toUpperCase() ?? null,
    entityName: input.entityName ?? null,
    schemaVersion: 1,
    evidenceCount: 0,
    asOf: now.slice(0, 10),
    createdAt: now,
    updatedAt: now,
    artifact: { kind: "draft", sections: {} },
    evidenceIds: [],
    liveBlocks: [],
    blocks: [],
    sourceMeta: null,
    _local: true,
  };

  const notes = readAll();
  notes.push(note);
  writeAll(notes);
  return note;
}

/** Update a local note's editable fields. */
export function updateLocalNote(
  id: string,
  patch: {
    title?: string;
    summary?: string | null;
    note?: string | null;
    tags?: string[];
    // Accept any block shape — localStorage is tolerant.
    blocks?: Array<{ id: string; type: string; [key: string]: unknown }>;
  },
): LocalNote | null {
  const notes = readAll();
  const index = notes.findIndex((n) => n.id === id);
  if (index < 0) return null;

  const existing = notes[index]!;
  // #197: blocks from PatchNoteInput may have any block type shape.
  // localStorage stores them as-is (tolerant reads on load).
  const mergedBlocks =
    patch.blocks !== undefined
      ? (patch.blocks as LocalNote["blocks"])
      : existing.blocks;
  const updated: LocalNote = {
    ...existing,
    ...(patch.title !== undefined && { title: patch.title }),
    ...(patch.summary !== undefined && { summary: patch.summary }),
    ...(patch.note !== undefined && { note: patch.note }),
    ...(patch.tags !== undefined && { tags: patch.tags }),
    blocks: mergedBlocks,
    updatedAt: new Date().toISOString(),
  };

  notes[index] = updated;
  writeAll(notes);
  return updated;
}

/** Delete a local note. */
export function deleteLocalNote(id: string): boolean {
  const notes = readAll();
  const filtered = notes.filter((n) => n.id !== id);
  if (filtered.length === notes.length) return false;
  writeAll(filtered);
  return true;
}

/** Check if a note id is a local-only note. */
export function isLocalNote(id: string): boolean {
  return id.startsWith("local_");
}
