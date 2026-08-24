/**
 * Research Workspace Shell — insert mapper tests (#170)
 *
 * Covers the issue's workspace checklist:
 * - inbox item → evidence_ref payload (unverified, honest fallbacks)
 * - PDF annotation → source_excerpt payload (pen / excerpt-less → null)
 * - old notes without liveBlocks degrade safely (no throw, no 500)
 */
import { describe, expect, it } from "vitest";

import {
  annotationIsInsertable,
  annotationToInsertInput,
  getNoteLiveBlocks,
  inboxItemToInsertInput,
} from "./workspace-view";

import type { LiveBlock } from "@workspace/shared/schema/live-block";
import type { InboxItem } from "~/modules/inbox/use-inbox";
import type { AnnotationItem, PdfItem } from "~/modules/pdfs/use-pdfs";

const INBOX_ITEM: InboxItem = {
  id: "inb_1",
  sourceType: "url",
  title: "某芯片公司 Q3 财报解读",
  url: "https://example.com/article",
  author: "analyst-li",
  publishedAt: "2026-08-20T10:00:00.000Z",
  rawText: "原文……",
  status: "inbox",
  noteId: null,
  createdAt: "2026-08-21T08:00:00.000Z",
  updatedAt: "2026-08-21T08:00:00.000Z",
};

const PDF: PdfItem = {
  id: "pdf_1",
  fileName: "NVDA-10K.pdf",
  fileSizeBytes: 1024,
  pageCount: 120,
  ticker: "NVDA",
  reportPeriod: "FY2026",
  sourceLabel: null,
  extractionStatus: "done",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("inboxItemToInsertInput", () => {
  it("maps an inbox item to an unverified evidence_ref payload", () => {
    const input = inboxItemToInsertInput(INBOX_ITEM);
    expect(input.mode).toBe("evidence_ref");
    if (input.mode !== "evidence_ref") return;
    expect(input.evidenceRef).toEqual({
      id: "inbox:inb_1",
      claim: "某芯片公司 Q3 财报解读",
      source: "analyst-li",
      date: "2026-08-20",
      url: "https://example.com/article",
      confidence: "unverified",
    });
    expect(input.sourceType).toBe("inbox");
    expect(input.title).toBe("某芯片公司 Q3 财报解读");
  });

  it("falls back to a lane label when author is missing", () => {
    const input = inboxItemToInsertInput({ ...INBOX_ITEM, author: null });
    if (input.mode !== "evidence_ref") throw new Error("wrong mode");
    expect(input.evidenceRef.source).toBe("网页剪藏");
  });

  it("falls back to createdAt when publishedAt is missing", () => {
    const input = inboxItemToInsertInput({
      ...INBOX_ITEM,
      publishedAt: null,
    });
    if (input.mode !== "evidence_ref") throw new Error("wrong mode");
    expect(input.evidenceRef.date).toBe("2026-08-21");
  });

  it("omits url when the item has none", () => {
    const input = inboxItemToInsertInput({ ...INBOX_ITEM, url: null });
    if (input.mode !== "evidence_ref") throw new Error("wrong mode");
    expect(input.evidenceRef.url).toBeUndefined();
  });
});

describe("annotationToInsertInput", () => {
  const base: Omit<AnnotationItem, "payload"> = {
    id: "ann_1",
    pdfId: "pdf_1",
    page: 7,
    kind: "highlight" as const,
    createdAt: "2026-08-10T00:00:00.000Z",
    updatedAt: "2026-08-10T00:00:00.000Z",
  };

  it("maps a highlight with excerpt to a source_excerpt payload", () => {
    const input = annotationToInsertInput(
      {
        ...base,
        payload: {
          kind: "highlight",
          rects: [{ x: 0, y: 0, width: 1, height: 1 }],
          excerpt: "Revenue grew 62% YoY.",
        },
      },
      PDF,
    );
    expect(input).not.toBeNull();
    if (input?.mode !== "source_excerpt") throw new Error("wrong mode");
    expect(input.title).toBe("NVDA-10K.pdf · p.7");
    expect(input.source).toBe("NVDA-10K.pdf");
    expect(input.sourceType).toBe("pdf");
    expect(input.excerpt).toBe("Revenue grew 62% YoY.");
  });

  it("prefers sourceLabel over fileName as the human source", () => {
    const input = annotationToInsertInput(
      {
        ...base,
        payload: {
          kind: "highlight",
          rects: [],
          excerpt: "x",
        },
      },
      { ...PDF, sourceLabel: "NVIDIA 10-K FY2026" },
    );
    if (input?.mode !== "source_excerpt") throw new Error("wrong mode");
    expect(input.source).toBe("NVIDIA 10-K FY2026");
  });

  it("maps a text annotation to an excerpt payload", () => {
    const input = annotationToInsertInput(
      {
        ...base,
        payload: { kind: "text", anchor: { x: 0, y: 0 }, text: "留意毛利率" },
      },
      PDF,
    );
    if (input?.mode !== "source_excerpt") throw new Error("wrong mode");
    expect(input.excerpt).toBe("留意毛利率");
  });

  it("returns null for pen annotations (no text to insert)", () => {
    expect(
      annotationToInsertInput(
        { ...base, payload: { kind: "pen", paths: [[]] } },
        PDF,
      ),
    ).toBeNull();
  });

  it("returns null for highlights without a captured excerpt", () => {
    expect(
      annotationToInsertInput(
        { ...base, payload: { kind: "highlight", rects: [] } },
        PDF,
      ),
    ).toBeNull();
  });
});

describe("annotationIsInsertable", () => {
  const base = {
    id: "ann_1",
    pdfId: "pdf_1",
    page: 1,
    kind: "highlight" as const,
    createdAt: "2026-08-10T00:00:00.000Z",
    updatedAt: "2026-08-10T00:00:00.000Z",
  };

  it("is true only for text-carrying annotations", () => {
    expect(
      annotationIsInsertable({
        ...base,
        payload: { kind: "highlight", rects: [], excerpt: "abc" },
      }),
    ).toBe(true);
    expect(
      annotationIsInsertable({
        ...base,
        payload: { kind: "text", anchor: { x: 0, y: 0 }, text: "abc" },
      }),
    ).toBe(true);
    expect(
      annotationIsInsertable({
        ...base,
        payload: { kind: "highlight", rects: [] },
      }),
    ).toBe(false);
    expect(
      annotationIsInsertable({ ...base, payload: { kind: "pen", paths: [] } }),
    ).toBe(false);
  });
});

describe("getNoteLiveBlocks (old-note compatibility)", () => {
  it("returns [] for notes saved before Live Blocks existed", () => {
    expect(getNoteLiveBlocks(undefined)).toEqual([]);
    expect(getNoteLiveBlocks(null)).toEqual([]);
    expect(getNoteLiveBlocks({})).toEqual([]);
    expect(getNoteLiveBlocks({ liveBlocks: null })).toEqual([]);
  });

  it("passes through existing blocks unchanged", () => {
    const block = { id: "lb_1" } as LiveBlock;
    expect(getNoteLiveBlocks({ liveBlocks: [block] })).toEqual([block]);
  });
});
