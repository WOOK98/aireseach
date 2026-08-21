/**
 * Research PDFs + annotations — knife-2 slice 1 (#152 direction)
 *
 * Users upload their own financial PDFs (earnings reports, research
 * papers), read them in-app, and annotate with pen / highlight / text.
 *
 * Core invariants (inherit #152 redlines):
 * - user-scoped from day one: no cross-user reads, no public links.
 * - blob storage key is derived server-side from userId + pdf id —
 *   clients never choose their own storage path.
 * - annotation payload is data (normalized 0-1 coordinates), edits
 *   create a new payload version + updatedAt; history is never
 *   silently rewritten.
 * - knife-2 slice 2 (#162): highlight payloads may carry an `excerpt`
 *   captured from the text layer at creation time; PDFs carry optional
 *   extracted full text for search (fail-open: extraction failure never
 *   blocks reading/annotating).
 */

import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import * as z from "zod";

import { generateId } from "@workspace/shared/utils";

import { createInsertSchema, createSelectSchema } from "../lib/zod";
import { user } from "./auth";

// ─── Annotation payload types (normalized 0-1 page coordinates) ─────────────

export const pdfAnnotationKindSchema = z.enum(["highlight", "pen", "text"]);
export type PdfAnnotationKind = z.infer<typeof pdfAnnotationKindSchema>;

/** A rectangle in normalized page coordinates (origin top-left). */
export const normalizedRectSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});

export const normalizedPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const highlightPayloadSchema = z.object({
  kind: z.literal("highlight"),
  rects: z.array(normalizedRectSchema).min(1),
  color: z.string().max(32).optional(),
  /**
   * Text captured from the PDF text layer at creation time (#162).
   * Optional for backwards compatibility with slice-1 payloads.
   */
  excerpt: z.string().max(2000).optional(),
});

export const penPayloadSchema = z.object({
  kind: z.literal("pen"),
  /** One annotation = one or more strokes; each stroke is a point list. */
  paths: z.array(z.array(normalizedPointSchema).min(2)).min(1),
  color: z.string().max(32).optional(),
  /** Stroke width relative to page width (0-1), e.g. 0.003. */
  strokeWidth: z.number().min(0).max(0.1).optional(),
});

export const textPayloadSchema = z.object({
  kind: z.literal("text"),
  anchor: normalizedPointSchema,
  text: z.string().min(1).max(2000),
  color: z.string().max(32).optional(),
});

export const pdfAnnotationPayloadSchema = z.discriminatedUnion("kind", [
  highlightPayloadSchema,
  penPayloadSchema,
  textPayloadSchema,
]);

// ─── Text extraction status (#162) ──────────────────────────────────────────

export const pdfExtractionStatusSchema = z.enum([
  "pending",
  "done",
  "failed",
  "truncated",
]);
export type PdfExtractionStatus = z.infer<typeof pdfExtractionStatusSchema>;

export type HighlightPayload = z.infer<typeof highlightPayloadSchema>;
export type PenPayload = z.infer<typeof penPayloadSchema>;
export type TextPayload = z.infer<typeof textPayloadSchema>;
export type PdfAnnotationPayload = z.infer<typeof pdfAnnotationPayloadSchema>;

// ─── research_pdfs ───────────────────────────────────────────────────────────

export const researchPdfs = pgTable(
  "research_pdfs",
  {
    id: text().primaryKey().$defaultFn(generateId),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // File metadata
    fileName: text("file_name").notNull(),
    /** Server-derived storage key: pdfs/{userId}/{id}.pdf — never client input. */
    blobKey: text("blob_key").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    pageCount: integer("page_count"), // filled by client after first render

    // Optional classification (editable)
    ticker: text(),
    reportPeriod: text("report_period"),
    sourceLabel: text("source_label"),

    // Full-text extraction (#162) — fail-open, never blocks reading.
    extractedText: text("extracted_text"),
    extractedAt: timestamp("extracted_at"),
    extractionStatus: text("extraction_status")
      .notNull()
      .default("pending")
      .$type<PdfExtractionStatus>(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date())
      .defaultNow(),
  },
  (table) => [
    index("research_pdfs_user_created_idx").on(table.userId, table.createdAt),
    index("research_pdfs_user_ticker_idx").on(table.userId, table.ticker),
  ],
);

// ─── pdf_annotations ─────────────────────────────────────────────────────────

export const pdfAnnotations = pgTable(
  "pdf_annotations",
  {
    id: text().primaryKey().$defaultFn(generateId),

    pdfId: text("pdf_id")
      .notNull()
      .references(() => researchPdfs.id, { onDelete: "cascade" }),

    /** Denormalized owner — every query still filters userId (defense in depth). */
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    page: integer().notNull(), // 1-based page number
    kind: text().notNull().$type<PdfAnnotationKind>(),
    payload: jsonb().notNull().$type<PdfAnnotationPayload>(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date())
      .defaultNow(),
  },
  (table) => [
    index("pdf_annotations_pdf_page_idx").on(table.pdfId, table.page),
    index("pdf_annotations_user_idx").on(table.userId),
  ],
);

// ─── Zod schemas ─────────────────────────────────────────────────────────────

export const insertResearchPdfSchema = createInsertSchema(researchPdfs);
export const selectResearchPdfSchema = createSelectSchema(researchPdfs);
export const insertPdfAnnotationSchema = createInsertSchema(pdfAnnotations);
export const selectPdfAnnotationSchema = createSelectSchema(pdfAnnotations);

export type InsertResearchPdf = z.infer<typeof insertResearchPdfSchema>;
export type SelectResearchPdf = z.infer<typeof selectResearchPdfSchema>;
export type InsertPdfAnnotation = z.infer<typeof insertPdfAnnotationSchema>;
export type SelectPdfAnnotation = z.infer<typeof selectPdfAnnotationSchema>;
