"use client";

/**
 * Local Notes — client-side persistence for offline-first workspace.
 *
 * Stores full NoteDetail objects in localStorage when the API is
 * unavailable. Notes use a `local_note_` prefix id. On next API
 * success the workspace syncs them to the server.
 */
import { generateId } from "@workspace/shared/utils";

import type { NoteDetail, NoteListItem } from "~/modules/notes/use-notes";

let userId: string | null = null;

function getStorageKey(): string {
  return userId
    ? `workspace:localNotes:${userId}`
    : "workspace:localNotes:anonymous";
}

/** Call once when user identity is known (e.g. session loaded). */
export function setLocalNotesUser(id: string | null) {
  userId = id;
}

function readLocalNotes(): NoteDetail[] {
  try {
    const raw = localStorage.getItem(getStorageKey());
    return raw ? (JSON.parse(raw) as NoteDetail[]) : [];
  } catch {
    return [];
  }
}

/** Throws on quota/security errors — callers must handle. */
function writeLocalNotes(notes: NoteDetail[]) {
  localStorage.setItem(getStorageKey(), JSON.stringify(notes));
}

export function createLocalNote(input: {
  title: string;
  article: NoteDetail["artifact"];
}): NoteDetail {
  const now = new Date().toISOString();
  const note: NoteDetail = {
    id: `local_note_${generateId()}`,
    title: input.title || "Untitled",
    summary: null,
    note: null,
    tags: [],
    kind: "article",
    entityTicker: null,
    entityName: null,
    schemaVersion: 1,
    evidenceCount: 0,
    asOf: now.slice(0, 10),
    createdAt: now,
    updatedAt: now,
    artifact: input.article,
    evidenceIds: [],
    liveBlocks: [],
    blocks: [],
    sourceMeta: null,
  };
  const existing = readLocalNotes();
  existing.unshift(note);
  writeLocalNotes(existing); // throws on failure
  return note;
}

export function getLocalNote(id: string): NoteDetail | null {
  return readLocalNotes().find((n) => n.id === id) ?? null;
}

export function listLocalNotes(): NoteListItem[] {
  return readLocalNotes().map((n) => ({
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

export function updateLocalNote(
  id: string,
  patch: Partial<Pick<NoteDetail, "title" | "blocks" | "updatedAt">>,
): NoteDetail | null {
  const notes = readLocalNotes();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx < 0) return null;
  const updated = {
    ...notes[idx]!,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  notes[idx] = updated;
  writeLocalNotes(notes); // throws on failure
  return updated;
}

export function deleteLocalNote(id: string) {
  const existing = readLocalNotes().filter((n) => n.id !== id);
  writeLocalNotes(existing); // throws on failure
}

export function isLocalNote(id: string): boolean {
  return id.startsWith("local_note_");
}
