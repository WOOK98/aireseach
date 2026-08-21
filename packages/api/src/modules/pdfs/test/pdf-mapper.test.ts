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
  buildEvidenceRef,
  createAnnotationInputSchema,
  createPdfInputSchema,
  MAX_PDF_SIZE_BYTES,
  patchAnnotationInputSchema,
  patchPdfInputSchema,
  pdfBlobKey,
  pdfEvidenceId,
  toAnnotationItem,
  toEvidenceInputSchema,
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
      extractionStatus: "pending" as const,
      createdAt: new Date("2026-08-20T00:00:00Z"),
      updatedAt: new Date("2026-08-20T00:00:00Z"),
    });
    expect(item).not.toHaveProperty("blobKey");
    expect(item.extractionStatus).toBe("pending");
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

// ── Slice 2 (#162): excerpt + annotation → evidence ─────────────────────────

describe("highlight excerpt (slice 2)", () => {
  it("accepts highlight payloads with an excerpt", () => {
    const payload = {
      kind: "highlight" as const,
      rects: [{ x: 0.1, y: 0.1, width: 0.5, height: 0.05 }],
      excerpt: "营收同比增长 122%",
    };
    expect(
      createAnnotationInputSchema.safeParse({ page: 3, payload }).success,
    ).toBe(true);
  });

  it("still accepts slice-1 highlight payloads without excerpt", () => {
    const payload = {
      kind: "highlight" as const,
      rects: [{ x: 0.1, y: 0.1, width: 0.5, height: 0.05 }],
    };
    expect(
      createAnnotationInputSchema.safeParse({ page: 3, payload }).success,
    ).toBe(true);
  });
});

describe("toEvidenceInputSchema", () => {
  it("accepts empty object and optional claim", () => {
    expect(toEvidenceInputSchema.safeParse({}).success).toBe(true);
    expect(
      toEvidenceInputSchema.safeParse({ claim: "毛利率承压" }).success,
    ).toBe(true);
  });

  it("rejects unknown keys and empty claim", () => {
    expect(toEvidenceInputSchema.safeParse({ foo: 1 }).success).toBe(false);
    expect(toEvidenceInputSchema.safeParse({ claim: "" }).success).toBe(false);
  });
});

describe("pdfEvidenceId", () => {
  it("is deterministic and re-traceable", () => {
    expect(pdfEvidenceId("p1", "a1")).toBe("pdf_p1_ann_a1");
  });
});

describe("buildEvidenceRef", () => {
  const pdf = {
    id: "p1",
    fileName: "NVDA-Q2-2026.pdf",
    reportPeriod: "2026Q2",
    createdAt: new Date("2026-08-20T00:00:00Z"),
  };

  const highlight = {
    id: "a1",
    page: 7,
    payload: {
      kind: "highlight" as const,
      rects: [{ x: 0.1, y: 0.1, width: 0.5, height: 0.05 }],
      excerpt: "数据中心营收 263 亿美元",
    },
  };

  it("highlight with excerpt → claim defaults to excerpt", () => {
    const ref = buildEvidenceRef(pdf, highlight);
    expect(ref).not.toBeNull();
    expect(ref).toEqual({
      id: "pdf_p1_ann_a1",
      claim: "数据中心营收 263 亿美元",
      source: "NVDA-Q2-2026.pdf p.7",
      date: "2026Q2",
      confidence: "partial",
    });
  });

  it("explicit claim wins over excerpt", () => {
    const ref = buildEvidenceRef(pdf, highlight, "毛利率指引低于预期");
    expect(ref?.claim).toBe("毛利率指引低于预期");
  });

  it("falls back to createdAt date when reportPeriod is null", () => {
    const ref = buildEvidenceRef({ ...pdf, reportPeriod: null }, highlight);
    expect(ref?.date).toBe("2026-08-20");
  });

  it("text annotation uses its text as excerpt", () => {
    const ref = buildEvidenceRef(pdf, {
      id: "a2",
      page: 2,
      payload: {
        kind: "text" as const,
        anchor: { x: 0.5, y: 0.5 },
        text: "注意汇率风险",
      },
    });
    expect(ref?.claim).toBe("注意汇率风险");
  });

  it("pen annotation without claim → null (caller maps to 400)", () => {
    const ref = buildEvidenceRef(pdf, {
      id: "a3",
      page: 1,
      payload: {
        kind: "pen" as const,
        paths: [
          [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ],
        ],
      },
    });
    expect(ref).toBeNull();
  });

  it("pen annotation with claim → ref", () => {
    const ref = buildEvidenceRef(
      pdf,
      {
        id: "a3",
        page: 1,
        payload: {
          kind: "pen" as const,
          paths: [
            [
              { x: 0, y: 0 },
              { x: 1, y: 1 },
            ],
          ],
        },
      },
      "圈出了管理层指引",
    );
    expect(ref?.claim).toBe("圈出了管理层指引");
  });

  it("as_of snapshot: later metadata edits never mutate the ref", () => {
    const ref = buildEvidenceRef(pdf, highlight);
    // Simulate a later fileName edit — the snapshot must not change.
    pdf.fileName = "renamed.pdf";
    expect(ref?.source).toBe("NVDA-Q2-2026.pdf p.7");
  });
});
