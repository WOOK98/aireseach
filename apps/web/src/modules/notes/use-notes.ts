"use client";

/**
 * Research Notes — API hooks (#154)
 *
 * Talks to /api/notes (user-scoped, session cookie auth).
 * Save failures surface explicit errors — nothing is silently dropped.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { DraftNoteArtifact } from "@workspace/shared/schema/article";
import type { LiveBlock } from "@workspace/shared/schema/live-block";
import type { NoteBlock } from "@workspace/shared/schema/note-block";
import type { ResearchArticle } from "@workspace/shared/types/article";

// ── Types (mirror API responses) ─────────────────────────────────────────

export interface NoteListItem {
  id: string;
  title: string;
  summary: string | null;
  note: string | null;
  tags: string[];
  /** "article" = LLM-generated; "draft" = converted inbox item (#165). */
  kind: string;
  entityTicker: string | null;
  entityName: string | null;
  schemaVersion: number;
  evidenceCount: number;
  asOf: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteDetail extends NoteListItem {
  /** article kind → ResearchArticle; draft kind → DraftNoteArtifact (#165). */
  artifact: ResearchArticle | DraftNoteArtifact;
  evidenceIds: string[];
  /** Live Blocks (#167) — refreshable evidence blocks, outside the artifact. */
  liveBlocks: LiveBlock[];
  /** Doc Blocks (#188) — user-authored document canvas blocks. */
  blocks: NoteBlock[];
  sourceMeta: { query?: string; language?: "zh" | "en" } | null;
}

export interface SaveNoteInput {
  title: string;
  summary?: string | null;
  note?: string | null;
  tags?: string[] | null;
  article: ResearchArticle;
  sourceMeta?: { query?: string; language?: "zh" | "en" } | null;
}

export interface PatchNoteInput {
  title?: string;
  summary?: string | null;
  note?: string | null;
  tags?: string[];
  /** Doc Blocks (#188) — full replacement of the user-authored canvas. */
  blocks?: NoteBlock[];
}

// ── Fetchers ─────────────────────────────────────────────────────────────

async function readError(res: Response): Promise<string> {
  const detail = await res.text().catch(() => "");
  try {
    const json = JSON.parse(detail) as { message?: string };
    if (json.message) return json.message;
  } catch {}
  return detail || `API error ${res.status}`;
}

async function fetchNotes(query: {
  q?: string;
  ticker?: string;
}): Promise<NoteListItem[]> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.ticker) params.set("ticker", query.ticker);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  const res = await fetch(`/api/notes${suffix}`);
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { notes: NoteListItem[] };
  return data.notes;
}

async function fetchNote(id: string): Promise<NoteDetail> {
  const res = await fetch(`/api/notes/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { note: NoteDetail };
  return data.note;
}

async function postNote(input: SaveNoteInput): Promise<NoteDetail> {
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { note: NoteDetail };
  return data.note;
}

export async function patchNote(
  id: string,
  patch: PatchNoteInput,
): Promise<NoteDetail> {
  const res = await fetch(`/api/notes/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { note: NoteDetail };
  return data.note;
}

export async function deleteNote(id: string): Promise<void> {
  const res = await fetch(`/api/notes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await readError(res));
}

// ── Live Blocks (#167) ─────────────────────────────────────────────────────

export type InsertLiveBlockInput =
  | {
      mode: "evidence_ref";
      evidenceRef: {
        id: string;
        claim: string;
        source: string;
        date: string;
        url?: string;
        confidence: "verified" | "partial" | "unverified";
      };
      title?: string;
      sourceType?: string;
    }
  | {
      mode: "source_excerpt";
      title: string;
      source: string;
      sourceUrl?: string;
      sourceType?: string;
      excerpt: string;
      evidenceIds?: string[];
    };

export async function insertLiveBlock(
  noteId: string,
  input: InsertLiveBlockInput,
): Promise<LiveBlock> {
  const res = await fetch(`/api/notes/${encodeURIComponent(noteId)}/blocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { block: LiveBlock };
  return data.block;
}

export async function refreshLiveBlock(
  noteId: string,
  blockId: string,
): Promise<LiveBlock> {
  const res = await fetch(
    `/api/notes/${encodeURIComponent(noteId)}/blocks/${encodeURIComponent(blockId)}/refresh`,
    { method: "POST" },
  );
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { block: LiveBlock };
  return data.block;
}

// ── Hooks ────────────────────────────────────────────────────────────────

export function useNotes(query: { q?: string; ticker?: string } = {}) {
  return useQuery({
    queryKey: ["research-notes", query],
    queryFn: () => fetchNotes(query),
    staleTime: 30_000,
  });
}

export function useNote(id: string) {
  return useQuery({
    queryKey: ["research-note", id],
    queryFn: () => fetchNote(id),
    enabled: id.length > 0,
  });
}

export function useSaveNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postNote,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["research-notes"] });
    },
  });
}

export function useUpdateNote(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: PatchNoteInput) => patchNote(id, patch),
    onSuccess: (note) => {
      queryClient.setQueryData(["research-note", id], note);
      void queryClient.invalidateQueries({ queryKey: ["research-notes"] });
    },
  });
}

export function useInsertLiveBlock(noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InsertLiveBlockInput) => insertLiveBlock(noteId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["research-note", noteId],
      });
    },
  });
}

export function useRefreshLiveBlock(noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (blockId: string) => refreshLiveBlock(noteId, blockId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["research-note", noteId],
      });
    },
  });
}
