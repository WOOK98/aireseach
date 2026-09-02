/**
 * Local PDFs — client-side fallback when /api/pdfs is unavailable (#197).
 *
 * Stores PDF metadata in localStorage so the workspace can show uploaded
 * PDFs even when the backend is down. The actual file bytes are NOT stored
 * client-side — extraction status is always "pending" in degraded mode.
 *
 * REDLINES:
 * - fileName / ticker / reportPeriod / sourceLabel are user content → notranslate
 * - no raw SQL, stack traces, or env var names in user-visible text
 */

import { deletePdfBlob, storePdfBlob } from "./local-pdf-blobs";

import type { PdfItem } from "./use-pdfs";

const STORAGE_KEY = "airesearch_local_pdfs";

export interface LocalPdf {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  pageCount: number | null;
  ticker: string | null;
  reportPeriod: string | null;
  sourceLabel: string | null;
  extractionStatus: "pending";
  createdAt: string;
  updatedAt: string;
  _local: true;
}

function generateId(): string {
  return `local_pdf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readAll(): LocalPdf[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as LocalPdf[];
  } catch {
    return [];
  }
}

function writeAll(pdfs: LocalPdf[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pdfs));
  } catch {
    /* quota exceeded */
  }
}

/** List all local PDFs, optionally filtered. */
export function listLocalPdfs(query?: {
  q?: string;
  ticker?: string;
}): PdfItem[] {
  let pdfs = readAll();

  if (query?.ticker) {
    const t = query.ticker.toUpperCase();
    pdfs = pdfs.filter((p) => p.ticker?.toUpperCase() === t);
  }
  if (query?.q) {
    const q = query.q.toLowerCase();
    pdfs = pdfs.filter(
      (p) =>
        p.fileName.toLowerCase().includes(q) ||
        (p.sourceLabel ?? "").toLowerCase().includes(q),
    );
  }

  return pdfs
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ _local: _, ...rest }) => rest);
}

/** Get one local PDF by id. */
export function getLocalPdf(id: string): PdfItem | null {
  const pdfs = readAll();
  const pdf = pdfs.find((p) => p.id === id);
  if (!pdf) return null;
  const { _local: _, ...rest } = pdf;
  return rest;
}

/** Create a local PDF metadata entry. If a File is provided, stores the
 *  bytes in IndexedDB so the reader can render the PDF in degraded mode. */
export function createLocalPdf(
  input: {
    fileName: string;
    fileSizeBytes: number;
    ticker?: string | null;
    reportPeriod?: string | null;
    sourceLabel?: string | null;
  },
  file?: File,
): LocalPdf {
  const now = new Date().toISOString();
  const pdf: LocalPdf = {
    id: generateId(),
    fileName: input.fileName,
    fileSizeBytes: input.fileSizeBytes,
    pageCount: null,
    ticker: input.ticker?.toUpperCase() ?? null,
    reportPeriod: input.reportPeriod ?? null,
    sourceLabel: input.sourceLabel ?? null,
    extractionStatus: "pending",
    createdAt: now,
    updatedAt: now,
    _local: true,
  };

  const pdfs = readAll();
  pdfs.push(pdf);
  writeAll(pdfs);

  // Store the actual file bytes in IndexedDB for reader rendering.
  if (file) {
    storePdfBlob(pdf.id, file).catch(() => {
      /* IndexedDB unavailable — PDF will show honest source-card path */
    });
  }

  return pdf;
}

/** Delete a local PDF and its stored blob. */
export function deleteLocalPdf(id: string): boolean {
  const pdfs = readAll();
  const filtered = pdfs.filter((p) => p.id !== id);
  if (filtered.length === pdfs.length) return false;
  writeAll(filtered);
  // Clean up the blob from IndexedDB.
  deletePdfBlob(id).catch(() => {});
  return true;
}

/** Check if a PDF id is a local-only entry. */
export function isLocalPdf(id: string): boolean {
  return id.startsWith("local_pdf_");
}
