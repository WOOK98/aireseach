/**
 * Live Blocks — view mapper (#167)
 *
 * Pure display logic for the note detail Live Blocks section.
 *
 * REDLINES:
 * - missing data is "N/A", never 0 or a blank that looks like "no change".
 * - failed blocks surface a neutral reason, never internal detail.
 * - unverified ≠ no change: every state has an explicit label.
 */
import type {
  LiveBlock,
  LiveBlockStaleState,
} from "@workspace/shared/schema/live-block";

/** Evidence entry normalized from either artifact kind (article | draft). */
export interface NoteEvidenceEntry {
  id: string;
  claim: string;
  source: string;
  date: string;
  url?: string;
  confidence: "verified" | "partial" | "unverified";
}

/**
 * Pull the evidence list out of either artifact kind. Returns [] for
 * unknown shapes — the insert picker simply has nothing to offer.
 */
export function extractNoteEvidence(artifact: unknown): NoteEvidenceEntry[] {
  if (!artifact || typeof artifact !== "object") return [];
  const evidence = (artifact as { evidence?: unknown }).evidence;
  if (!Array.isArray(evidence)) return [];
  const out: NoteEvidenceEntry[] = [];
  for (const item of evidence) {
    if (!item || typeof item !== "object") continue;
    const e = item as Record<string, unknown>;
    if (
      typeof e.id === "string" &&
      typeof e.claim === "string" &&
      typeof e.source === "string" &&
      typeof e.date === "string" &&
      (e.confidence === "verified" ||
        e.confidence === "partial" ||
        e.confidence === "unverified")
    ) {
      out.push({
        id: e.id,
        claim: e.claim,
        source: e.source,
        date: e.date,
        url: typeof e.url === "string" && e.url.length > 0 ? e.url : undefined,
        confidence: e.confidence,
      });
    }
  }
  return out;
}

// ── Status display ───────────────────────────────────────────────────────────

export function staleStateLabel(state: LiveBlockStaleState): string {
  switch (state) {
    case "fresh":
      return "已刷新";
    case "stale":
      return "待刷新";
    case "failed":
      return "刷新失败";
    case "manual_only":
      return "仅手动";
  }
}

export function staleStateBadgeVariant(
  state: LiveBlockStaleState,
): "default" | "secondary" | "destructive" | "outline" {
  switch (state) {
    case "fresh":
      return "default";
    case "stale":
      return "secondary";
    case "failed":
      return "destructive";
    case "manual_only":
      return "outline";
  }
}

/** Date/period shown on the block — missing data renders as N/A, never 0. */
export function blockDateLabel(block: LiveBlock): string {
  if (block.type === "evidence_ref") {
    return block.content.date || "N/A";
  }
  const captured = block.capturedAt;
  return captured ? captured.slice(0, 10) : "N/A";
}

/** One-line meta: "source · date/period". Missing pieces show as N/A. */
export function blockMetaLabel(block: LiveBlock): string {
  const source = block.source?.trim() || "N/A";
  return `${source} · ${blockDateLabel(block)}`;
}

/** Neutral user-visible refresh failure text — never internal detail. */
export function blockRefreshErrorLabel(block: LiveBlock): string | null {
  if (block.staleState !== "failed") return null;
  return (
    block.refreshError ??
    "Source could not be reached. Showing last saved content."
  );
}

/** Refresh is meaningful only when a live source URL exists; URL-less
 * manual blocks get no active button (server would confirm manual_only). */
export function canRefreshBlock(block: LiveBlock): boolean {
  return Boolean(block.sourceUrl?.trim());
}

/** True when this evidence entry is already captured as a block. */
export function evidenceAlreadyBlocked(
  blocks: LiveBlock[],
  evidenceId: string,
): boolean {
  return blocks.some((b) => b.evidenceIds.includes(evidenceId));
}
