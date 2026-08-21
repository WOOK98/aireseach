import { z } from "zod";

/**
 * Research PDFs — pure helpers (knife-2 slice 1 + slice 2 #162)
 *
 * Validation + sanitization logic, kept DB-free for unit testing.
 *
 * INVARIANTS:
 * - blobKey is ALWAYS derived server-side (pdfs/{userId}/{id}.pdf);
 *   clients never supply a storage path.
 * - Editable fields: fileName / ticker / reportPeriod / sourceLabel /
 *   pageCount. Nothing else may be patched (strict schema).
 * - Annotation payload must match its kind (discriminated union) and
 *   use normalized 0-1 page coordinates.
 * - Upload cap: 50MB, PDF file names only.
 * - Slice 2: annotation → EvidenceRef conversion produces an as_of
 *   snapshot (#152 evidence-drift redline) — fileName/page/reportPeriod
 *   are read once at conversion time and never rewritten afterwards.
 */
import {
  pdfAnnotationKindSchema,
  pdfAnnotationPayloadSchema,
} from "@workspace/db/schema";
import { evidenceRefSchema } from "@workspace/shared/schema/article";

import type {
  PdfAnnotationKind,
  PdfAnnotationPayload,
  PdfExtractionStatus,
} from "@workspace/db/schema";
import type { EvidenceRef } from "@workspace/shared/types/article";

export const MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

// ── Input schemas ────────────────────────────────────────────────────────────

export const createPdfInputSchema = z.object({
  fileName: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .refine((n) => n.toLowerCase().endsWith(".pdf"), {
      message: "Only PDF files are allowed.",
    }),
  fileSizeBytes: z.number().int().min(1).max(MAX_PDF_SIZE_BYTES),
  ticker: z.string().trim().max(24).nullish(),
  reportPeriod: z.string().trim().max(40).nullish(),
  sourceLabel: z.string().trim().max(120).nullish(),
});

export const patchPdfInputSchema = z
  .object({
    fileName: z.string().trim().min(1).max(255).optional(),
    ticker: z.string().trim().max(24).nullable().optional(),
    reportPeriod: z.string().trim().max(40).nullable().optional(),
    sourceLabel: z.string().trim().max(120).nullable().optional(),
    pageCount: z.number().int().min(1).max(10000).optional(),
  })
  .strict(); // blobKey / userId / fileSizeBytes are NOT patchable

export const listPdfsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  ticker: z.string().trim().max(24).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createAnnotationInputSchema = z.object({
  page: z.number().int().min(1).max(10000),
  payload: pdfAnnotationPayloadSchema,
});

export const patchAnnotationInputSchema = z
  .object({
    payload: pdfAnnotationPayloadSchema,
  })
  .strict();

// ── Slice 2 (#162): annotation → evidence ────────────────────────────────────

export const toEvidenceInputSchema = z
  .object({
    /** User-phrased claim. Required for pen annotations (no excerpt). */
    claim: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

export type ToEvidenceInput = z.infer<typeof toEvidenceInputSchema>;

/** Deterministic, re-traceable evidence id (idempotent re-conversion). */
export function pdfEvidenceId(pdfId: string, annotationId: string): string {
  return `pdf_${pdfId}_ann_${annotationId}`;
}

const CLAIM_EXCERPT_MAX = 280;

interface PdfMetaForEvidence {
  id: string;
  fileName: string;
  reportPeriod: string | null;
  createdAt: Date | string;
}

interface AnnotationForEvidence {
  id: string;
  page: number;
  payload: PdfAnnotationPayload;
}

const isoDate = (d: Date | string) =>
  (d instanceof Date ? d.toISOString() : new Date(d).toISOString()).slice(
    0,
    10,
  );

/**
 * Build an as_of EvidenceRef snapshot from an annotation.
 *
 * Returns null when no claim text can be derived (pen annotation without
 * an explicit user claim) — the caller maps this to a neutral 400.
 *
 * The output is validated against the #117 evidenceRefSchema so anything
 * produced here can flow straight into the article generator's evidence
 * array (same schema, no second evidence system — #152 redline).
 */
export function buildEvidenceRef(
  pdf: PdfMetaForEvidence,
  annotation: AnnotationForEvidence,
  claim?: string,
): EvidenceRef | null {
  const payload = annotation.payload;
  const excerpt =
    payload.kind === "highlight"
      ? payload.excerpt
      : payload.kind === "text"
        ? payload.text
        : undefined;

  const finalClaim =
    claim ?? (excerpt ? excerpt.slice(0, CLAIM_EXCERPT_MAX) : undefined);
  if (!finalClaim || finalClaim.trim().length === 0) return null;

  const ref = {
    id: pdfEvidenceId(pdf.id, annotation.id),
    claim: finalClaim.trim(),
    source: `${pdf.fileName} p.${annotation.page}`,
    date: pdf.reportPeriod ?? isoDate(pdf.createdAt),
    // User annotations are human-sourced, not machine-verified.
    confidence: "partial" as const,
  };

  const parsed = evidenceRefSchema.safeParse(ref);
  return parsed.success ? (parsed.data as EvidenceRef) : null;
}

export type CreatePdfInput = z.infer<typeof createPdfInputSchema>;
export type PatchPdfInput = z.infer<typeof patchPdfInputSchema>;
export type ListPdfsQuery = z.infer<typeof listPdfsQuerySchema>;
export type CreateAnnotationInput = z.infer<typeof createAnnotationInputSchema>;
export type PatchAnnotationInput = z.infer<typeof patchAnnotationInputSchema>;

// ── Blob key derivation ──────────────────────────────────────────────────────

/**
 * Server-side storage key. User-scoped prefix keeps every tenant's blobs
 * isolated; the client never chooses a path.
 */
export function pdfBlobKey(userId: string, pdfId: string): string {
  return `pdfs/${userId}/${pdfId}.pdf`;
}

// ── Annotation helpers ───────────────────────────────────────────────────────

/**
 * The DB `kind` column is derived from the payload discriminator — callers
 * can never send a kind/payload mismatch.
 */
export function annotationKindFromPayload(payload: unknown): PdfAnnotationKind {
  const parsed = pdfAnnotationPayloadSchema.parse(payload);
  return pdfAnnotationKindSchema.parse(parsed.kind);
}

// ── Response mappers ─────────────────────────────────────────────────────────

interface PdfRow {
  id: string;
  fileName: string;
  blobKey: string;
  fileSizeBytes: number;
  pageCount: number | null;
  ticker: string | null;
  reportPeriod: string | null;
  sourceLabel: string | null;
  extractionStatus: PdfExtractionStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface AnnotationRow {
  id: string;
  pdfId: string;
  page: number;
  kind: PdfAnnotationKind;
  payload: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const iso = (d: Date | string) =>
  d instanceof Date ? d.toISOString() : new Date(d).toISOString();

/** blobKey never leaves the server — clients get time-limited URLs only. */
export function toPdfItem(row: PdfRow) {
  return {
    id: row.id,
    fileName: row.fileName,
    fileSizeBytes: row.fileSizeBytes,
    pageCount: row.pageCount,
    ticker: row.ticker,
    reportPeriod: row.reportPeriod,
    sourceLabel: row.sourceLabel,
    extractionStatus: row.extractionStatus,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function toAnnotationItem(row: AnnotationRow) {
  return {
    id: row.id,
    pdfId: row.pdfId,
    page: row.page,
    kind: row.kind,
    payload: row.payload,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}
