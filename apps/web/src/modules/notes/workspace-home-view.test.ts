/**
 * Workspace Home v1 — view logic tests (#172)
 *
 * Covers the issue's home checklist:
 * - recents merge real notes/PDF/inbox sources, sorted by recency, capped
 * - unknown (loading/error) sources contribute nothing and stay null in
 *   summary/loop state — missing data is never rendered as 0
 * - Publish step is always disabled, never executable
 * - greeting + local search filter behave honestly
 */
import { describe, expect, it } from "vitest";

import {
  buildRecents,
  filterRecents,
  greetingForHour,
  homeSummary,
  researchLoopState,
} from "./workspace-home-view";

import type { InboxItem } from "~/modules/inbox/use-inbox";
import type { NoteListItem } from "~/modules/notes/use-notes";
import type { PdfItem } from "~/modules/pdfs/use-pdfs";

function note(partial: Partial<NoteListItem> & { id: string }): NoteListItem {
  return {
    title: "笔记",
    summary: null,
    note: null,
    tags: [],
    kind: "article",
    entityTicker: null,
    entityName: null,
    schemaVersion: 1,
    evidenceCount: 0,
    asOf: "2026-08-20",
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
    ...partial,
  };
}

function pdf(partial: Partial<PdfItem> & { id: string }): PdfItem {
  return {
    fileName: "report.pdf",
    fileSizeBytes: 1024,
    pageCount: 10,
    ticker: null,
    reportPeriod: null,
    sourceLabel: null,
    extractionStatus: "done",
    createdAt: "2026-08-10T00:00:00.000Z",
    updatedAt: "2026-08-10T00:00:00.000Z",
    ...partial,
  };
}

function inbox(partial: Partial<InboxItem> & { id: string }): InboxItem {
  return {
    sourceType: "url",
    title: "收件",
    url: null,
    author: null,
    publishedAt: null,
    rawText: null,
    status: "inbox",
    noteId: null,
    createdAt: "2026-08-15T00:00:00.000Z",
    updatedAt: "2026-08-15T00:00:00.000Z",
    ...partial,
  };
}

describe("buildRecents", () => {
  it("merges all three sources sorted by recency (newest first)", () => {
    const recents = buildRecents({
      notes: [
        note({ id: "n1", title: "旧笔记", updatedAt: "2026-08-01T00:00:00Z" }),
        note({ id: "n2", title: "新笔记", updatedAt: "2026-08-24T00:00:00Z" }),
      ],
      pdfs: [
        pdf({
          id: "p1",
          fileName: "mid.pdf",
          updatedAt: "2026-08-15T00:00:00Z",
        }),
      ],
      inbox: [
        inbox({
          id: "i1",
          title: "最新收件",
          updatedAt: "2026-08-25T00:00:00Z",
        }),
      ],
    });
    expect(recents.map((r) => r.id)).toEqual(["i1", "n2", "p1", "n1"]);
    expect(recents.map((r) => r.kind)).toEqual([
      "inbox",
      "note",
      "pdf",
      "note",
    ]);
  });

  it("carries ticker/period/author meta with honest fallbacks", () => {
    const recents = buildRecents({
      notes: [note({ id: "n1", entityTicker: "NVDA" })],
      pdfs: [pdf({ id: "p1", reportPeriod: "FY2026" })],
      inbox: [inbox({ id: "i1", author: "analyst-li" })],
    });
    const byId = Object.fromEntries(recents.map((r) => [r.id, r]));
    expect(byId.n1?.meta).toBe("NVDA");
    expect(byId.p1?.meta).toBe("FY2026");
    expect(byId.i1?.meta).toBe("analyst-li");
  });

  it("null meta stays null when no ticker/period/author exists", () => {
    const recents = buildRecents({ notes: [note({ id: "n1" })] });
    expect(recents[0]?.meta).toBeNull();
  });

  it("treats null/undefined sources as unknown and contributes nothing", () => {
    expect(buildRecents({ notes: null, pdfs: undefined, inbox: null })).toEqual(
      [],
    );
  });

  it("sinks unparseable timestamps to the bottom instead of crashing", () => {
    const recents = buildRecents({
      notes: [
        note({
          id: "bad",
          title: "坏日期",
          updatedAt: "not-a-date",
          createdAt: "not-a-date",
        }),
        note({ id: "ok", title: "好日期", updatedAt: "2026-08-01T00:00:00Z" }),
      ],
    });
    expect(recents.map((r) => r.id)).toEqual(["ok", "bad"]);
  });

  it("respects the limit", () => {
    const notes = Array.from({ length: 15 }).map((_, i) =>
      note({
        id: `n${i}`,
        updatedAt: `2026-08-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
      }),
    );
    const recents = buildRecents({ notes, limit: 5 });
    expect(recents).toHaveLength(5);
    expect(recents[0]?.id).toBe("n14");
  });
});

describe("filterRecents", () => {
  const recents = buildRecents({
    notes: [note({ id: "n1", title: "芯片行业跟踪", entityTicker: "NVDA" })],
    pdfs: [pdf({ id: "p1", fileName: "apple-10k.pdf" })],
  });

  it("returns everything for a blank query", () => {
    expect(filterRecents(recents, "  ")).toHaveLength(2);
  });

  it("matches title and meta case-insensitively", () => {
    expect(filterRecents(recents, "芯片").map((r) => r.id)).toEqual(["n1"]);
    expect(filterRecents(recents, "nvda").map((r) => r.id)).toEqual(["n1"]);
    expect(filterRecents(recents, "APPLE").map((r) => r.id)).toEqual(["p1"]);
    expect(filterRecents(recents, "不存在的")).toEqual([]);
  });
});

describe("researchLoopState", () => {
  it("marks known non-empty sources active with real counts", () => {
    const state = researchLoopState({
      inbox: [inbox({ id: "i1" }), inbox({ id: "i2" })],
      notes: [note({ id: "n1" })],
    });
    expect(state.capture).toEqual({ status: "active", count: 2 });
    expect(state.create).toEqual({ status: "active", count: 1 });
  });

  it("marks empty sources empty (honest zero — the data IS known)", () => {
    const state = researchLoopState({ inbox: [], notes: [] });
    expect(state.capture).toEqual({ status: "empty", count: 0 });
    expect(state.create).toEqual({ status: "empty", count: 0 });
  });

  it("keeps unknown sources unknown — never collapses to 0", () => {
    const state = researchLoopState({ inbox: null, notes: undefined });
    expect(state.capture).toEqual({ status: "unknown", count: null });
    expect(state.create).toEqual({ status: "unknown", count: null });
  });

  it("publish is always disabled, regardless of data", () => {
    const withData = researchLoopState({
      inbox: [inbox({ id: "i1" })],
      notes: [note({ id: "n1" })],
    });
    const withoutData = researchLoopState({});
    for (const state of [withData, withoutData]) {
      expect(state.publish.status).toBe("disabled");
      expect(state.publish.count).toBeNull();
    }
  });
});

describe("homeSummary", () => {
  it("reports real counts and null for unknown sources", () => {
    const summary = homeSummary({
      notes: [note({ id: "n1" })],
      inbox: null,
      pdfs: [],
    });
    expect(summary.noteCount).toBe(1);
    expect(summary.inboxCount).toBeNull();
    expect(summary.pdfCount).toBe(0);
  });
});

describe("greetingForHour", () => {
  it("covers the whole day", () => {
    expect(greetingForHour(2)).toBe("夜深了");
    expect(greetingForHour(8)).toBe("早上好");
    expect(greetingForHour(13)).toBe("中午好");
    expect(greetingForHour(16)).toBe("下午好");
    expect(greetingForHour(21)).toBe("晚上好");
  });

  it("falls back for out-of-range hours", () => {
    expect(greetingForHour(-1)).toBe("你好");
    expect(greetingForHour(24)).toBe("你好");
    expect(greetingForHour(Number.NaN)).toBe("你好");
  });
});
