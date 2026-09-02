/**
 * Local annotations — client-side fallback when /api/pdfs is unavailable (#197).
 *
 * Stores annotation data in localStorage so local PDFs can be annotated
 * in degraded mode. Annotations are keyed by PDF id for efficient lookup.
 *
 * REDLINES:
 * - Annotation text content is user data → notranslate
 * - No raw backend errors, secrets, or internal paths in user-visible text
 */

import type {
  AnnotationItem,
  AnnotationKind,
  AnnotationPayload,
} from "./use-pdfs";

const STORAGE_KEY = "airesearch_local_annotations";

interface StoredAnnotation {
  id: string;
  pdfId: string;
  page: number;
  kind: AnnotationKind;
  payload: AnnotationPayload;
  createdAt: string;
  updatedAt: string;
}

function generateId(): string {
  return `local_ann_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readAll(): StoredAnnotation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StoredAnnotation[];
  } catch {
    return [];
  }
}

function writeAll(annotations: StoredAnnotation[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
  } catch {
    /* quota exceeded */
  }
}

/** List all annotations for a local PDF. */
export function listLocalAnnotations(pdfId: string): AnnotationItem[] {
  const all = readAll();
  return all
    .filter((a) => a.pdfId === pdfId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Create a local annotation for a local PDF. */
export function createLocalAnnotation(
  pdfId: string,
  input: { page: number; payload: AnnotationPayload },
): AnnotationItem {
  const now = new Date().toISOString();
  const annotation: StoredAnnotation = {
    id: generateId(),
    pdfId,
    page: input.page,
    kind: input.payload.kind,
    payload: input.payload,
    createdAt: now,
    updatedAt: now,
  };

  const all = readAll();
  all.push(annotation);
  writeAll(all);

  return annotation;
}

/** Delete a local annotation by id. */
export function deleteLocalAnnotation(id: string): boolean {
  const all = readAll();
  const filtered = all.filter((a) => a.id !== id);
  if (filtered.length === all.length) return false;
  writeAll(filtered);
  return true;
}

/** Check if an annotation id is local-only. */
export function isLocalAnnotation(id: string): boolean {
  return id.startsWith("local_ann_");
}

/**
 * Convert a local annotation into an EvidenceRef snapshot (client-side).
 * For highlight/text annotations, the excerpt/claim comes from the payload.
 * For pen annotations, the user must supply a claim.
 */
export function localAnnotationToEvidence(
  annotation: AnnotationItem,
  claim?: string,
): {
  id: string;
  claim: string;
  source: string;
  date: string;
  confidence: "partial";
} {
  let resolvedClaim: string;
  if (claim) {
    resolvedClaim = claim;
  } else if (
    annotation.payload.kind === "highlight" &&
    annotation.payload.excerpt
  ) {
    resolvedClaim = annotation.payload.excerpt;
  } else if (annotation.payload.kind === "text") {
    resolvedClaim = annotation.payload.text;
  } else {
    resolvedClaim = "Annotation evidence (no text content)";
  }

  return {
    id: annotation.id,
    claim: resolvedClaim,
    source: `Local PDF annotation (page ${annotation.page})`,
    date: annotation.createdAt.slice(0, 10),
    confidence: "partial",
  };
}
