"use client";

/**
 * Local Notes — localStorage-backed note persistence for offline-first workspace.
 *
 * Notes with `local_note_` prefix IDs are stored entirely client-side.
 * The API hooks in use-notes.ts fall back to these when the server is
 * unavailable, and merge them with server notes on successful fetches.
 */
import { generateId } from "@workspace/shared/utils";

import type { NoteDetail, NoteListItem, PatchNoteInput } from "./use-notes";

const STORAGE_KEY = "airesearch_local_notes";

// ── Storage helpers ─────────────────────────────────────────────────────────

function readAll(): NoteDetail[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NoteDetail[]) : [];
  } catch {
    return [];
  }
}

function writeAll(notes: NoteDetail[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {}
}

// ── Public API (matches use-notes.ts expectations) ──────────────────────────

export function isLocalNote(id: string): boolean {
  return id.startsWith("local_note_");
}

export function listLocalNotes(query?: {
  q?: string;
  ticker?: string;
}): NoteListItem[] {
  let notes = readAll();

  if (query?.ticker) {
    const t = query.ticker.toUpperCase();
    notes = notes.filter(
      (n) => n.entityTicker && n.entityTicker.toUpperCase() === t,
    );
  }
  if (query?.q) {
    const q = query.q.toLowerCase();
    notes = notes.filter(
      (n) =>
        (n.title || "").toLowerCase().includes(q) ||
        (n.entityTicker || "").toLowerCase().includes(q),
    );
  }

  return notes.map((n) => ({
    id: n.id,
    title: n.title,
    summary: n.summary,
    note: n.note,
    tags: n.tags,
    kind: n.kind,
    entityTicker: n.entityTicker,
    entityName: n.entityName,
    schemaVersion: n.schemaVersion,
    evidenceCount: n.evidenceIds?.length ?? 0,
    asOf: n.asOf,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }));
}

export function getLocalNote(id: string): NoteDetail | null {
  const notes = readAll();
  return notes.find((n) => n.id === id) ?? null;
}

export function createLocalNote(input: {
  title: string;
  article?: NoteDetail["artifact"];
  entityTicker?: string;
  entityName?: string;
  summary?: string;
}): NoteDetail & { _local: true } {
  const now = new Date().toISOString();
  const ticker = input.entityTicker ? input.entityTicker.toUpperCase() : null;
  const artifact = input.article ?? {
    schema_version: 1 as const,
    entity: {
      resolvedName: input.title || "Untitled",
      mode: "ticker" as const,
      dataTimestamp: now.slice(0, 10),
    },
    coreThesis: { thesis: "", keyDriver: "", evidenceIds: ["E1"] },
    industryChain: {
      narrative: "",
      visual: { kind: "empty" as const, title: "产业链图", reason: "新建页面" },
      evidenceIds: ["E1"],
    },
    evidenceMatrix: {
      narrative: "",
      visual: {
        kind: "empty" as const,
        title: "关键数据表",
        reason: "新建页面",
      },
      evidenceIds: ["E1"],
    },
    companyLayer: { narrative: "", evidenceIds: ["E1"] },
    conclusion: {
      summary: "",
      risks: [],
      invalidationConditions: [],
      evidenceIds: ["E1"],
    },
    evidence: [
      {
        id: "E1",
        claim: "新建空白页面",
        source: "系统",
        date: now.slice(0, 10),
        url: "",
        confidence: "unverified" as const,
      },
    ],
    generatedAt: now,
    language: "zh" as const,
    disclaimer: "本报告仅供研究参考，不构成投资建议。",
  };

  const note: NoteDetail & { _local: true } = {
    id: `local_note_${generateId()}`,
    title: input.title || "Untitled",
    summary: input.summary ?? null,
    note: null,
    tags: [],
    kind: "draft",
    entityTicker: ticker,
    entityName: input.entityName ?? null,
    schemaVersion: 1,
    evidenceCount: 0,
    asOf: now,
    createdAt: now,
    updatedAt: now,
    artifact,
    evidenceIds: [],
    liveBlocks: [],
    blocks: [],
    sourceMeta: null,
    _local: true,
  };

  const existing = readAll();
  existing.unshift(note);
  writeAll(existing);
  return note;
}

export function updateLocalNote(
  id: string,
  patch: PatchNoteInput,
): NoteDetail | null {
  const notes = readAll();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx < 0) return null;
  const note = notes[idx]!;
  const updated: NoteDetail = {
    ...note,
    title: patch.title ?? note.title,
    summary: patch.summary !== undefined ? patch.summary : note.summary,
    note: patch.note !== undefined ? patch.note : note.note,
    tags: patch.tags ?? note.tags,
    blocks: patch.blocks ?? note.blocks,
    updatedAt: new Date().toISOString(),
  };
  notes[idx] = updated;
  writeAll(notes);
  return updated;
}

export function deleteLocalNote(id: string) {
  const notes = readAll().filter((n) => n.id !== id);
  writeAll(notes);
}
