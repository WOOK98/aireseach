"use client";

/**
 * Research PDFs — API hooks (knife-2 slice 1)
 *
 * Talks to /api/pdfs (user-scoped, session cookie auth).
 * Upload flow: POST /api/pdfs (metadata) → presigned PUT to storage →
 * bytes never pass through the app server.
 * Failures surface explicit errors — nothing is silently dropped.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ── Types (mirror API responses) ─────────────────────────────────────────

export interface PdfItem {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  pageCount: number | null;
  ticker: string | null;
  reportPeriod: string | null;
  sourceLabel: string | null;
  /** Full-text extraction state (#162) — fail-open, reading never blocks. */
  extractionStatus: "pending" | "done" | "failed" | "truncated";
  createdAt: string;
  updatedAt: string;
}

export interface PdfDetail extends PdfItem {
  /** Time-limited signed URL for the raw file (never a public link). */
  fileUrl: string;
}

export type AnnotationKind = "highlight" | "pen" | "text";

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NormalizedPoint {
  x: number;
  y: number;
}

export type AnnotationPayload =
  | {
      kind: "highlight";
      rects: NormalizedRect[];
      color?: string;
      /** Text-layer excerpt captured at creation time (#162). */
      excerpt?: string;
    }
  | {
      kind: "pen";
      paths: NormalizedPoint[][];
      color?: string;
      strokeWidth?: number;
    }
  | { kind: "text"; anchor: NormalizedPoint; text: string; color?: string };

/** #117-compatible evidence snapshot produced by to-evidence (#162). */
export interface EvidenceRef {
  id: string;
  claim: string;
  source: string;
  date: string;
  url?: string;
  confidence: "verified" | "partial" | "unverified";
}

export interface AnnotationItem {
  id: string;
  pdfId: string;
  page: number;
  kind: AnnotationKind;
  payload: AnnotationPayload;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePdfInput {
  fileName: string;
  fileSizeBytes: number;
  ticker?: string | null;
  reportPeriod?: string | null;
  sourceLabel?: string | null;
}

export interface PatchPdfInput {
  fileName?: string;
  ticker?: string | null;
  reportPeriod?: string | null;
  sourceLabel?: string | null;
  pageCount?: number;
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

async function fetchPdfs(query: {
  q?: string;
  ticker?: string;
}): Promise<PdfItem[]> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.ticker) params.set("ticker", query.ticker);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  const res = await fetch(`/api/pdfs${suffix}`);
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { pdfs: PdfItem[] };
  return data.pdfs;
}

async function fetchPdf(id: string): Promise<PdfDetail> {
  const res = await fetch(`/api/pdfs/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { pdf: PdfItem; fileUrl: string };
  return { ...data.pdf, fileUrl: data.fileUrl };
}

/**
 * Register metadata → upload bytes via presigned URL.
 * Throws (with the server row rolled back) when either leg fails.
 */
async function uploadPdf(input: CreatePdfInput, file: File): Promise<PdfItem> {
  const res = await fetch("/api/pdfs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { pdf: PdfItem; uploadUrl: string };

  const put = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: file,
  });
  if (!put.ok) {
    // Best-effort cleanup: drop the metadata row so it doesn't strand.
    await fetch(`/api/pdfs/${encodeURIComponent(data.pdf.id)}`, {
      method: "DELETE",
    }).catch(() => {});
    throw new Error("Upload failed.");
  }
  return data.pdf;
}

export async function patchPdf(
  id: string,
  patch: PatchPdfInput,
): Promise<PdfItem> {
  const res = await fetch(`/api/pdfs/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { pdf: PdfItem };
  return data.pdf;
}

export async function deletePdf(id: string): Promise<void> {
  const res = await fetch(`/api/pdfs/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await readError(res));
}

async function fetchAnnotations(pdfId: string): Promise<AnnotationItem[]> {
  const res = await fetch(`/api/pdfs/${encodeURIComponent(pdfId)}/annotations`);
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { annotations: AnnotationItem[] };
  return data.annotations;
}

async function postAnnotation(
  pdfId: string,
  input: { page: number; payload: AnnotationPayload },
): Promise<AnnotationItem> {
  const res = await fetch(
    `/api/pdfs/${encodeURIComponent(pdfId)}/annotations`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { annotation: AnnotationItem };
  return data.annotation;
}

async function deleteAnnotation(id: string): Promise<void> {
  const res = await fetch(`/api/pdfs/annotations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await readError(res));
}

/** #162: convert an annotation into an as_of EvidenceRef snapshot. */
export async function toEvidence(
  pdfId: string,
  annotationId: string,
  claim?: string,
): Promise<EvidenceRef> {
  const res = await fetch(
    `/api/pdfs/${encodeURIComponent(pdfId)}/annotations/${encodeURIComponent(annotationId)}/to-evidence`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(claim ? { claim } : {}),
    },
  );
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { evidence: EvidenceRef };
  return data.evidence;
}

/** #162: trigger server-side full-text extraction (fail-open). */
export async function extractPdf(id: string): Promise<{
  extractionStatus: PdfItem["extractionStatus"];
}> {
  const res = await fetch(`/api/pdfs/${encodeURIComponent(id)}/extract`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as {
    extractionStatus: PdfItem["extractionStatus"];
  };
}

// ── Hooks ────────────────────────────────────────────────────────────────

export function usePdfs(query: { q?: string; ticker?: string } = {}) {
  return useQuery({
    queryKey: ["research-pdfs", query],
    queryFn: () => fetchPdfs(query),
  });
}

export function usePdf(id: string) {
  return useQuery({
    queryKey: ["research-pdfs", "detail", id],
    queryFn: () => fetchPdf(id),
    // Signed URLs expire (1h) — refetch rather than cache forever.
    staleTime: 5 * 60 * 1000,
  });
}

export function useUploadPdf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, file }: { input: CreatePdfInput; file: File }) =>
      uploadPdf(input, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["research-pdfs"] });
    },
  });
}

export function usePatchPdf(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: PatchPdfInput) => patchPdf(id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["research-pdfs"] });
    },
  });
}

export function useDeletePdf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePdf(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["research-pdfs"] });
    },
  });
}

export function annotationsQueryOptions(pdfId: string) {
  return {
    queryKey: ["pdf-annotations", pdfId] as const,
    queryFn: () => fetchAnnotations(pdfId),
    // Never fire /api/pdfs//annotations when no PDF is selected —
    // an empty id is a normal workspace state (no PDFs yet).
    enabled: pdfId.length > 0,
  };
}

export function useAnnotations(pdfId: string) {
  return useQuery(annotationsQueryOptions(pdfId));
}

export function useCreateAnnotation(pdfId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { page: number; payload: AnnotationPayload }) =>
      postAnnotation(pdfId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["pdf-annotations", pdfId] });
    },
  });
}

export function useDeleteAnnotation(pdfId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAnnotation(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["pdf-annotations", pdfId] });
    },
  });
}
