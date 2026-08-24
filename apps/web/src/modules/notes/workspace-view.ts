import type { InsertLiveBlockInput } from "./use-notes";
import type { LiveBlock } from "@workspace/shared/schema/live-block";
/**
 * Research Workspace Shell — insert mappers (#170)
 *
 * Pure mapping from right-rail sources (Evidence Inbox item / PDF
 * annotation) to Live Block insert payloads, plus old-note tolerant
 * readers. DB-free and render-free so the logic is unit-testable.
 *
 * REDLINES:
 * - unverified ≠ no change: inbox-derived refs are born "unverified".
 * - missing data is not zero: absent author/date fall back to honest
 *   labels, never "" or 0.
 * - pen annotations / excerpt-less highlights carry no text — they map to
 *   null (nothing honest to insert) instead of a fabricated excerpt.
 */
import type { InboxItem } from "~/modules/inbox/use-inbox";
import type { AnnotationItem, PdfItem } from "~/modules/pdfs/use-pdfs";

/** Neutral source labels per inbox lane — no vendor/internal names. */
const INBOX_SOURCE_LABELS: Record<InboxItem["sourceType"], string> = {
  url: "网页剪藏",
  paste: "手动粘贴",
  x_post: "X 帖子",
};

/**
 * Inbox item → evidence_ref Live Block insert payload.
 *
 * The inbox has no extracted claims, so the item title becomes the claim
 * and confidence is always "unverified" (honest provenance redline).
 * Date falls back publishedAt → createdAt; both are required DB fields.
 */
export function inboxItemToInsertInput(item: InboxItem): InsertLiveBlockInput {
  const source =
    item.author?.trim() ||
    INBOX_SOURCE_LABELS[item.sourceType] ||
    "Evidence Inbox";
  const date = (item.publishedAt ?? item.createdAt).slice(0, 10);
  return {
    mode: "evidence_ref",
    evidenceRef: {
      id: `inbox:${item.id}`.slice(0, 80),
      claim: item.title.slice(0, 2000),
      source: source.slice(0, 200),
      date,
      url: item.url || undefined,
      confidence: "unverified",
    },
    title: item.title.slice(0, 200),
    sourceType: "inbox",
  };
}

/**
 * PDF annotation → source_excerpt Live Block insert payload.
 *
 * - highlight with captured excerpt → excerpt block
 * - text annotation → its text as excerpt
 * - pen / excerpt-less highlight → null (nothing honest to insert)
 */
export function annotationToInsertInput(
  annotation: AnnotationItem,
  pdf: PdfItem,
): InsertLiveBlockInput | null {
  const payload = annotation.payload;
  const title = `${pdf.fileName} · p.${annotation.page}`.slice(0, 200);
  const source = (pdf.sourceLabel?.trim() || pdf.fileName).slice(0, 200);

  let excerpt: string | null = null;
  if (payload.kind === "highlight") {
    excerpt = payload.excerpt?.trim() || null;
  } else if (payload.kind === "text") {
    excerpt = payload.text.trim() || null;
  }
  if (!excerpt) return null;

  return {
    mode: "source_excerpt",
    title,
    source,
    sourceType: "pdf",
    excerpt: excerpt.slice(0, 20000),
    evidenceIds: [],
  };
}

/** True when an annotation yields an insertable block (for rail display). */
export function annotationIsInsertable(annotation: AnnotationItem): boolean {
  const payload = annotation.payload;
  if (payload.kind === "highlight") return Boolean(payload.excerpt?.trim());
  if (payload.kind === "text") return Boolean(payload.text.trim());
  return false;
}

/**
 * Old-note tolerant reader: notes saved before Live Blocks (#167) may
 * carry a missing/null liveBlocks field. Never throws, never 500s.
 */
export function getNoteLiveBlocks(
  note: { liveBlocks?: LiveBlock[] | null } | null | undefined,
): LiveBlock[] {
  return note?.liveBlocks ?? [];
}
