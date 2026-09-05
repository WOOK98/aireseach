"use client";

/**
 * Local Notes — client-side note creation for offline-first workspace.
 *
 * Creates a note in localStorage when the API is unavailable.
 * The note has a temporary `local_note_` prefix id; on next API success,
 * the workspace syncs it to the server.
 */
import { generateId } from "@workspace/shared/utils";

interface LocalNoteMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "workspace:localNotes";

function readLocalNotes(): LocalNoteMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocalNoteMeta[]) : [];
  } catch {
    return [];
  }
}

function writeLocalNotes(notes: LocalNoteMeta[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {}
}

export function createLocalNote(input: { title: string }): LocalNoteMeta {
  const now = new Date().toISOString();
  const note: LocalNoteMeta = {
    id: `local_note_${generateId()}`,
    title: input.title || "Untitled",
    createdAt: now,
    updatedAt: now,
  };
  const existing = readLocalNotes();
  existing.unshift(note);
  writeLocalNotes(existing);
  return note;
}

export function listLocalNotes(): LocalNoteMeta[] {
  return readLocalNotes();
}

export function deleteLocalNote(id: string) {
  const existing = readLocalNotes().filter((n) => n.id !== id);
  writeLocalNotes(existing);
}

export function isLocalNote(id: string): boolean {
  return id.startsWith("local_note_");
}
