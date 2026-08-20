/**
 * Research PDFs — mapper unit tests (knife-2 slice 1)
 *
 * Covers:
 *   - create input validation (PDF-only names, 50MB cap)
 *   - patch input strictness (blobKey/userId/fileSizeBytes rejected)
 *   - blob key derivation (server-side, user-scoped)
 *   - annotation payload <-> kind consistency
 *   - normalized coordinate bounds
 *   - response mappers never leak blobKey
 */
import { describe, expect, it } from "vitest";

import {
  annotationKindFromPayload,
  createAnnotationInputSchema,
  createPdfInputSchema,
  MAX_PDF_SIZE_BYTES,
  patchAnnotationInputSchema,
  patchPdfInputSchema,
  pdfBlobKey,
  toAnnotationItem,
  toPdfItem,
} from "../pdf-mapper";

describe("createPdfInputSchema", () => {
  it("accepts a valid PDF registration", () => {
    const parsed = createPdfInputSchema.parse({
      fileName: "NVDA-Q2-2026.pdf",
      fileSizeBytes: 1024 * 1024,
      ticker: "NVDA",
      reportPeriod: "2026Q2",
      sourceLabel: "NVIDIA IR",
    });
    expect(parsed.fileName).toBe("NVDA-Q2-2026.pdf");
  });

  it("rejects non-PDF file names", () => {
    for (const name of ["report.docx", "evil.pdf.exe", "data.csv", "PDF"]) {
      const r = createPdfInputSchema.safeParse({
        fileName: name,
        fileSizeBytes: 100,
      });
      expect(r.success).toBe(false);
    }
  });

  it("accepts uppercase .PDF extension", () => {
    const r = createPdfInputSchema.safeParse({
      fileName: "EARNINGS.PDF",
      fileSizeBytes: 100,
    });
    expect(r.success).toBe(true);
  });

  it("enforces the 50MB cap", () => {
    expect(
      createPdfInputSchema.safeParse({
        fileName: "big.pdf",
        fileSizeBytes: MAX_PDF_SIZE_BYTES,
      }).success,
    ).toBe(true);
    expect(
      createPdfInputSchema.safeParse({
        fileName: "big.pdf",
        fileSizeBytes: MAX_PDF_SIZE_BYTES + 1,
      }).success,
    ).toBe(false);
  });

  it("rejects zero/negative sizes", () => {
    for (const size of [0, -1, 1.5]) {
      expect(
        createPdfInputSchema.safeParse({
          fileName: "a.pdf",
          fileSizeBytes: size,
        }).success,
      ).toBe(false);
    }
  });
});

describe("patchPdfInputSchema", () => {
  it("allows metadata edits", () => {
    const parsed = patchPdfInputSchema.parse({
      ticker: "NVDA",
      reportPeriod: null,
      pageCount: 42,
    });
    expect(parsed.pageCount).toBe(42);
  });

  it("rejects immutable keys (strict)", () => {
    for (const key of ["blobKey", "userId", "fileSizeBytes", "id"]) {
      const r = patchPdfInputSchema.safeParse({ [key]: "x" });
      expect(r.success).toBe(false);
    }
  });
});

describe("pdfBlobKey", () => {
  it("derives a user-scoped key from userId + pdfId", () => {
    expect(pdfBlobKey("user-1", "pdf-9")).toBe("pdfs/user-1/pdf-9.pdf");
  });

  it("isolates tenants by prefix", () => {
    expect(pdfBlobKey("alice", "p1")).not.toBe(pdfBlobKey("bob", "p1"));
  });
});

describe("annotation payloads", () => {
  const highlight = {
    kind: "highlight",
    rects: [{ x: 0.1, y: 0.2, width: 0.3, height: 0.05 }],
  };
  const pen = {
    kind: "pen",
    paths: [
      [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.5 },
      ],
    ],
    strokeWidth: 0.003,
  };
  const text = {
    kind: "text",
    anchor: { x: 0.2, y: 0.4 },
    text: "毛利率超预期",
  };

  it("accepts all three kinds and derives kind from payload", () => {
    for (const [payload, kind] of [
      [highlight, "highlight"],
      [pen, "pen"],
      [text, "text"],
    ] as const) {
      const parsed = createAnnotationInputSchema.parse({ page: 3, payload });
      expect(annotationKindFromPayload(parsed.payload)).toBe(kind);
    }
  });

  it("rejects coordinates outside 0-1", () => {
    const bad = {
      kind: "highlight",
      rects: [{ x: -0.1, y: 0.2, width: 0.3, height: 0.05 }],
    };
    expect(
      createAnnotationInputSchema.safeParse({ page: 1, payload: bad }).success,
    ).toBe(false);
  });

  it("rejects unknown kinds and mismatched payloads", () => {
    expect(
      createAnnotationInputSchema.safeParse({
        page: 1,
        payload: { kind: "arrow", rects: [] },
      }).success,
    ).toBe(false);
    // kind says highlight but has pen shape
    expect(
      createAnnotationInputSchema.safeParse({
        page: 1,
        payload: { kind: "highlight", paths: pen.paths },
      }).success,
    ).toBe(false);
  });

  it("rejects empty highlight rects and single-point pen strokes", () => {
    expect(
      createAnnotationInputSchema.safeParse({
        page: 1,
        payload: { kind: "highlight", rects: [] },
      }).success,
    ).toBe(false);
    expect(
      createAnnotationInputSchema.safeParse({
        page: 1,
        payload: { kind: "pen", paths: [[{ x: 0.1, y: 0.1 }]] },
      }).success,
    ).toBe(false);
  });

  it("rejects empty text annotations", () => {
    expect(
      createAnnotationInputSchema.safeParse({
        page: 1,
        payload: { kind: "text", anchor: { x: 0, y: 0 }, text: "" },
      }).success,
    ).toBe(false);
  });

  it("patch schema is strict (payload only)", () => {
    expect(
      patchAnnotationInputSchema.safeParse({ payload: highlight }).success,
    ).toBe(true);
    expect(
      patchAnnotationInputSchema.safeParse({
        payload: highlight,
        page: 5,
      }).success,
    ).toBe(false);
  });
});

describe("response mappers", () => {
  it("toPdfItem never exposes blobKey", () => {
    const item = toPdfItem({
      id: "p1",
      fileName: "a.pdf",
      blobKey: "pdfs/u1/p1.pdf",
      fileSizeBytes: 10,
      pageCount: null,
      ticker: null,
      reportPeriod: null,
      sourceLabel: null,
      createdAt: new Date("2026-08-20T00:00:00Z"),
      updatedAt: new Date("2026-08-20T00:00:00Z"),
    });
    expect(item).not.toHaveProperty("blobKey");
    expect(item.createdAt).toBe("2026-08-20T00:00:00.000Z");
  });

  it("toAnnotationItem round-trips payload verbatim", () => {
    const payload = {
      kind: "pen" as const,
      paths: [
        [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      ],
    };
    const item = toAnnotationItem({
      id: "a1",
      pdfId: "p1",
      page: 2,
      kind: "pen",
      payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(item.payload).toEqual(payload);
    expect(item.page).toBe(2);
  });
});
