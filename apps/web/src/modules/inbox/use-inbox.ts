"use client";

/**
 * Evidence Inbox — API hooks (#165)
 *
 * Talks to /api/inbox (user-scoped, session cookie auth).
 * Save failures surface explicit errors — nothing is silently dropped.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ── Types (mirror API responses) ─────────────────────────────────────────

export type InboxSourceType = "url" | "paste" | "x_post";
export type InboxStatus = "inbox" | "converted" | "archived";

export interface InboxItem {
  id: string;
  sourceType: InboxSourceType;
  title: string;
  url: string | null;
  author: string | null;
  publishedAt: string | null;
  rawText: string | null;
  status: InboxStatus;
  noteId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInboxItemInput {
  sourceType: InboxSourceType;
  title: string;
  url?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  rawText?: string | null;
}

export interface PatchInboxItemInput {
  title?: string;
  author?: string | null;
  publishedAt?: string | null;
  rawText?: string | null;
  status?: "archived";
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

async function fetchInbox(status?: InboxStatus): Promise<InboxItem[]> {
  const suffix = status ? `?status=${status}` : "";
  const res = await fetch(`/api/inbox${suffix}`);
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { items: InboxItem[] };
  return data.items;
}

export async function createInboxItem(
  input: CreateInboxItemInput,
): Promise<InboxItem> {
  const res = await fetch("/api/inbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { item: InboxItem };
  return data.item;
}

export async function patchInboxItem(
  id: string,
  input: PatchInboxItemInput,
): Promise<InboxItem> {
  const res = await fetch(`/api/inbox/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { item: InboxItem };
  return data.item;
}

export async function convertInboxItem(
  id: string,
): Promise<{ noteId: string; alreadyConverted: boolean }> {
  const res = await fetch(`/api/inbox/${encodeURIComponent(id)}/convert`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as { noteId: string; alreadyConverted: boolean };
}

export async function deleteInboxItem(id: string): Promise<void> {
  const res = await fetch(`/api/inbox/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await readError(res));
}

// ── Hooks ────────────────────────────────────────────────────────────────

export function useInbox(status?: InboxStatus) {
  return useQuery({
    queryKey: ["inbox", status ?? "all"],
    queryFn: () => fetchInbox(status),
  });
}

export function useInboxMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["inbox"] });

  const create = useMutation({
    mutationFn: createInboxItem,
    onSuccess: invalidate,
  });
  const patch = useMutation({
    mutationFn: ({ id, input }: { id: string; input: PatchInboxItemInput }) =>
      patchInboxItem(id, input),
    onSuccess: invalidate,
  });
  const convert = useMutation({
    mutationFn: convertInboxItem,
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: deleteInboxItem,
    onSuccess: invalidate,
  });

  return { create, patch, convert, remove };
}
