/**
 * PDF full-text extraction (#162, knife-2 slice 2)
 *
 * Server-side text extraction for search + future evidence excerpts.
 *
 * REDLINES:
 * - Fail-open: extraction failure NEVER blocks upload/read/annotate —
 *   callers record `extractionStatus: "failed"` and move on.
 * - Bounded work: at most MAX_EXTRACT_PAGES pages and MAX_EXTRACT_CHARS
 *   characters; anything larger is truncated + flagged so serverless
 *   runtime stays predictable.
 * - pdfjs-dist is dynamically imported so the heavy parser stays out of
 *   the cold path (bundle size / first-hit latency).
 */

/** Hard caps — a 10k-page filing must not blow the function budget. */
export const MAX_EXTRACT_PAGES = 200;
export const MAX_EXTRACT_CHARS = 500_000;

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  /** True when pages or chars were cut by the caps above. */
  truncated: boolean;
}

interface PdfTextItem {
  str?: string;
}

interface PdfPageLike {
  getTextContent(): Promise<{ items: PdfTextItem[] }>;
}

interface PdfDocumentLike {
  numPages: number;
  getPage(n: number): Promise<PdfPageLike>;
  destroy(): Promise<void>;
}

interface PdfjsLike {
  getDocument(opts: {
    data: Uint8Array;
    isEvalSupported: boolean;
    disableFontFace: boolean;
  }): { promise: Promise<PdfDocumentLike> };
}

/**
 * Extract text from raw PDF bytes. Throws on unparseable input — the
 * caller is responsible for the fail-open status bookkeeping.
 */
export async function extractPdfText(
  bytes: Uint8Array,
): Promise<PdfExtractionResult> {
  // Legacy build runs headless in Node (fake worker, no DOM needed for
  // the text-extraction path).
  const pdfjs =
    (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as PdfjsLike;

  const doc = await pdfjs.getDocument({
    data: bytes,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise;

  try {
    const pageCount = doc.numPages;
    const pagesToRead = Math.min(pageCount, MAX_EXTRACT_PAGES);
    const parts: string[] = [];
    let chars = 0;
    let truncated = pageCount > MAX_EXTRACT_PAGES;

    for (let n = 1; n <= pagesToRead; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => (typeof item.str === "string" ? item.str : ""))
        .join(" ")
        .trim();
      if (pageText.length > 0) {
        parts.push(pageText);
        chars += pageText.length + 1;
        if (chars >= MAX_EXTRACT_CHARS) {
          truncated = true;
          break;
        }
      }
    }

    let text = parts.join("\n");
    if (text.length > MAX_EXTRACT_CHARS) {
      text = text.slice(0, MAX_EXTRACT_CHARS);
      truncated = true;
    }

    return { text, pageCount, truncated };
  } finally {
    await doc.destroy().catch(() => {});
  }
}
