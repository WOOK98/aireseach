/**
 * Workspace Home v1 — pure view logic (#172)
 *
 * Notion-style research command center on top of the #170 workspace shell.
 * All functions are pure and unit-tested; the React layer only renders.
 *
 * REDLINES honored here:
 * - missing data ≠ 0: unknown (loading/error) sources stay `null`, never
 *   collapse to 0 or fake progress.
 * - no mock/fixture data in production paths — every RecentItem comes from
 *   real notes / PDFs / inbox API responses.
 * - Publish step is always `disabled` — no executable publish state exists.
 */
import type { InboxItem } from "~/modules/inbox/use-inbox";
import type { NoteListItem } from "~/modules/notes/use-notes";
import type { PdfItem } from "~/modules/pdfs/use-pdfs";

// ── Recents ─────────────────────────────────────────────────────────────────

export type RecentKind = "note" | "pdf" | "inbox";

export interface RecentItem {
  kind: RecentKind;
  id: string;
  title: string;
  /** ISO timestamp used for sort + display (dynamic → notranslate). */
  timestamp: string;
  /** Optional ticker / period / author meta (dynamic → notranslate). */
  meta: string | null;
}

// ── Navigation / continuation targets ───────────────────────────────────────

export type HomeNavKey =
  | "home"
  | "workspace"
  | "write"
  | "reader"
  | "inbox"
  | "publish"
  | "search";

/** Routes the React layer injects from pathsConfig (keeps this file pure). */
export interface HomeRoutes {
  research: string;
  pdfs: string;
  inbox: string;
  pdf: (id: string) => string;
}

/**
 * Real route for nav entries that leave the workspace shell.
 * In-shell modes (home/workspace/search) and the disabled publish placeholder
 * return null so the React layer renders them as buttons, never fake links.
 */
export function homeNavHref(
  key: HomeNavKey,
  routes: Pick<HomeRoutes, "research" | "pdfs" | "inbox">,
): string | null {
  if (key === "write") return routes.research;
  if (key === "reader") return routes.pdfs;
  if (key === "inbox") return routes.inbox;
  return null;
}

/**
 * Continuation target for a recent item.
 * Notes open inside the workspace shell (no route change), so they return
 * null; PDFs deep-link to the reader; inbox items continue on the inbox page
 * where convert/archive actions live.
 */
export function recentItemHref(
  item: RecentItem,
  routes: Pick<HomeRoutes, "pdf" | "inbox">,
): string | null {
  if (item.kind === "pdf") return routes.pdf(item.id);
  if (item.kind === "inbox") return routes.inbox;
  return null;
}

const DEFAULT_RECENTS_LIMIT = 10;

function timestampMs(value: string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms;
}

/**
 * Merge notes / PDFs / inbox items into one recency-ordered list.
 * Sources that are still loading or errored pass `null` and contribute
 * nothing (honest — we never fabricate placeholder entries).
 * Items with unparseable timestamps sink to the bottom, stable by kind.
 */
export function buildRecents(input: {
  notes?: NoteListItem[] | null;
  pdfs?: PdfItem[] | null;
  inbox?: InboxItem[] | null;
  limit?: number;
}): RecentItem[] {
  const items: RecentItem[] = [];

  for (const note of input.notes ?? []) {
    items.push({
      kind: "note",
      id: note.id,
      title: note.title,
      timestamp: note.updatedAt || note.createdAt,
      meta: note.entityTicker ?? note.entityName ?? null,
    });
  }

  for (const pdf of input.pdfs ?? []) {
    items.push({
      kind: "pdf",
      id: pdf.id,
      title: pdf.fileName,
      timestamp: pdf.updatedAt || pdf.createdAt,
      meta: pdf.ticker ?? pdf.reportPeriod ?? null,
    });
  }

  for (const entry of input.inbox ?? []) {
    items.push({
      kind: "inbox",
      id: entry.id,
      title: entry.title,
      timestamp: entry.updatedAt || entry.createdAt,
      meta: entry.author ?? null,
    });
  }

  items.sort((a, b) => timestampMs(b.timestamp) - timestampMs(a.timestamp));

  const limit = input.limit ?? DEFAULT_RECENTS_LIMIT;
  return items.slice(0, Math.max(0, limit));
}

/** Case-insensitive local filter over recents (Search nav entry). */
export function filterRecents(
  recents: RecentItem[],
  query: string,
): RecentItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return recents;
  return recents.filter((item) =>
    [item.title, item.meta ?? ""].some((field) =>
      field.toLowerCase().includes(q),
    ),
  );
}

// ── Research Loop (Capture → Create → Publish) ─────────────────────────────

export type LoopStepStatus = "active" | "empty" | "unknown" | "disabled";

export interface LoopStep {
  status: LoopStepStatus;
  /** Real count when known; `null` when the source is loading/errored. */
  count: number | null;
}

export interface ResearchLoopState {
  capture: LoopStep;
  create: LoopStep;
  /** v1: publish is always a disabled placeholder — never executable. */
  publish: LoopStep;
}

/**
 * Derive loop progress from real data only.
 * `null`/`undefined` source → `unknown` (render honestly as N/A, never 0).
 */
const loopStep = (source: readonly unknown[] | null | undefined): LoopStep => {
  if (source == null) return { status: "unknown", count: null };
  if (source.length === 0) return { status: "empty", count: 0 };
  return { status: "active", count: source.length };
};

export function researchLoopState(input: {
  inbox?: InboxItem[] | null;
  notes?: NoteListItem[] | null;
}): ResearchLoopState {
  return {
    capture: loopStep(input.inbox),
    create: loopStep(input.notes),
    publish: { status: "disabled", count: null },
  };
}

// ── Greeting ────────────────────────────────────────────────────────────────

/** Time-of-day greeting (zh). Out-of-range hours fall back to a neutral one. */
export function greetingForHour(hour: number): string {
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return "你好";
  if (hour < 5) return "夜深了";
  if (hour < 12) return "早上好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

// ── Summary line ────────────────────────────────────────────────────────────

export interface HomeSummary {
  /** null when the underlying query is loading/errored — render as "—". */
  noteCount: number | null;
  inboxCount: number | null;
  pdfCount: number | null;
}

export function homeSummary(input: {
  notes?: NoteListItem[] | null;
  inbox?: InboxItem[] | null;
  pdfs?: PdfItem[] | null;
}): HomeSummary {
  return {
    noteCount: input.notes == null ? null : input.notes.length,
    inboxCount: input.inbox == null ? null : input.inbox.length,
    pdfCount: input.pdfs == null ? null : input.pdfs.length,
  };
}
