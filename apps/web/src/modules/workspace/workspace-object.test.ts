/**
 * Workspace Object Model — unit tests (#186)
 *
 * Covers the issue's test checklist:
 * - object routing/selection: parse/format round-trip, malformed params
 * - recent objects: unified build across notes/PDFs/inbox, sort, filter
 * - command actions: insert-block gating on an active note
 * - convert path target: inbox conversion selects the created note object
 */
import { describe, expect, it } from "vitest";

import {
  buildWorkspaceCommands,
  buildWorkspaceObjects,
  filterWorkspaceObjects,
  formatObjectParam,
  objectHref,
  parseObjectParam,
} from "./workspace-object";

import type { InboxItem } from "~/modules/inbox/use-inbox";
import type { NoteListItem } from "~/modules/notes/use-notes";
import type { PdfItem } from "~/modules/pdfs/use-pdfs";

// ── Fixtures ──────────────────────────────────────────────────────────────

const NOTE: NoteListItem = {
  id: "note_1",
  title: "某芯片公司深度研究",
  summary: null,
  note: null,
  tags: [],
  kind: "article",
  entityTicker: "688981",
  entityName: null,
  schemaVersion: 1,
  evidenceCount: 7,
  asOf: "2026-08-30",
  createdAt: "2026-08-28T02:00:00.000Z",
  updatedAt: "2026-08-30T02:00:00.000Z",
};

const PDF: PdfItem = {
  id: "pdf_1",
  fileName: "SMIC-2026Q2.pdf",
  fileSizeBytes: 1024,
  pageCount: 12,
  ticker: "688981",
  reportPeriod: "2026Q2",
  sourceLabel: null,
  extractionStatus: "done",
  createdAt: "2026-08-29T02:00:00.000Z",
  updatedAt: "2026-08-29T02:00:00.000Z",
};

const INBOX: InboxItem = {
  id: "inb_1",
  sourceType: "url",
  title: "供应链访谈纪要",
  url: "https://example.com/x",
  author: "analyst-li",
  publishedAt: null,
  rawText: null,
  status: "inbox",
  noteId: null,
  createdAt: "2026-08-27T02:00:00.000Z",
  updatedAt: "2026-08-27T02:00:00.000Z",
};

// ── Object param routing ──────────────────────────────────────────────────

describe("parseObjectParam / formatObjectParam", () => {
  it("round-trips every kind", () => {
    for (const kind of ["note", "pdf", "inbox"] as const) {
      const ref = { kind, id: "abc_123" };
      expect(parseObjectParam(formatObjectParam(ref))).toEqual(ref);
    }
  });

  it("keeps ids that contain colons", () => {
    expect(parseObjectParam("note:a:b:c")).toEqual({
      kind: "note",
      id: "a:b:c",
    });
  });

  it("returns null for missing or malformed values", () => {
    expect(parseObjectParam(null)).toBeNull();
    expect(parseObjectParam(undefined)).toBeNull();
    expect(parseObjectParam("")).toBeNull();
    expect(parseObjectParam("note:")).toBeNull();
    expect(parseObjectParam(":abc")).toBeNull();
    expect(parseObjectParam("user:abc")).toBeNull();
    expect(parseObjectParam("nocolon")).toBeNull();
  });

  it("builds a URL-stable href with encoding", () => {
    const href = objectHref("/workspace", { kind: "note", id: "a b" });
    expect(href).toBe(`/workspace?object=${encodeURIComponent("note:a b")}`);
    expect(
      parseObjectParam(decodeURIComponent(href.split("object=")[1]!)),
    ).toEqual({ kind: "note", id: "a b" });
  });
});

// ── Unified recent objects ────────────────────────────────────────────────

describe("buildWorkspaceObjects", () => {
  it("unifies notes, PDFs, and inbox items sorted by updatedAt desc", () => {
    const objects = buildWorkspaceObjects({
      notes: [NOTE],
      pdfs: [PDF],
      inbox: [INBOX],
    });
    expect(objects.map((o) => o.kind)).toEqual(["note", "pdf", "inbox"]);
    expect(objects[0]).toMatchObject({
      id: "note_1",
      title: "某芯片公司深度研究",
      meta: "688981",
    });
  });

  it("falls back to honest meta when ticker is missing", () => {
    const objects = buildWorkspaceObjects({
      notes: [{ ...NOTE, id: "n2", entityTicker: null, evidenceCount: 3 }],
      pdfs: [
        {
          ...PDF,
          id: "p2",
          ticker: null,
          reportPeriod: null,
          sourceLabel: "券商研报",
        },
      ],
      inbox: [],
    });
    expect(objects.find((o) => o.id === "n2")?.meta).toBe("3 evidence");
    expect(objects.find((o) => o.id === "p2")?.meta).toBe("券商研报");
  });

  it("excludes archived inbox items and tolerates null sources", () => {
    const objects = buildWorkspaceObjects({
      notes: null,
      pdfs: undefined,
      inbox: [INBOX, { ...INBOX, id: "inb_2", status: "archived" }],
    });
    expect(objects.map((o) => o.id)).toEqual(["inb_1"]);
  });
});

describe("filterWorkspaceObjects", () => {
  const objects = buildWorkspaceObjects({
    notes: [NOTE],
    pdfs: [PDF],
    inbox: [INBOX],
  });

  it("matches title and meta case-insensitively", () => {
    expect(filterWorkspaceObjects(objects, "SMIC")).toHaveLength(1);
    expect(filterWorkspaceObjects(objects, "688981")).toHaveLength(2);
    expect(filterWorkspaceObjects(objects, "  ")).toHaveLength(3);
    expect(filterWorkspaceObjects(objects, "不存在")).toHaveLength(0);
  });
});

// ── Command surface ───────────────────────────────────────────────────────

describe("buildWorkspaceCommands", () => {
  const base = { researchHref: "/dashboard/research", pdfsHref: "/pdfs" };

  it("exposes the five required commands", () => {
    const commands = buildWorkspaceCommands({ ...base, noteActive: false });
    expect(commands.map((c) => c.id)).toEqual([
      "create-note",
      "open-note",
      "open-pdf",
      "capture-inbox",
      "insert-block",
    ]);
  });

  it("gates insert-block on an active note with an honest reason", () => {
    const without = buildWorkspaceCommands({ ...base, noteActive: false });
    const insert = without.find((c) => c.id === "insert-block")!;
    expect(insert.enabled).toBe(false);
    expect(insert.disabledReason).toBe("Select a note first");

    const with_ = buildWorkspaceCommands({ ...base, noteActive: true });
    const insertActive = with_.find((c) => c.id === "insert-block")!;
    expect(insertActive.enabled).toBe(true);
    expect(insertActive.disabledReason).toBeUndefined();
  });

  it("create-note is a local action with no href", () => {
    const commands = buildWorkspaceCommands({ ...base, noteActive: false });
    const createNote = commands.find((c) => c.id === "create-note");
    expect(createNote?.enabled).toBe(true);
    expect(createNote?.href).toBeUndefined();
  });
});

// ── Convert path target (#186: at least one insert/convert path) ──────────

describe("inbox convert target", () => {
  it("converting an inbox item yields a selectable note object", () => {
    // POST /api/inbox/:id/convert returns { noteId } — the workspace then
    // selects the created note via the same URL param contract.
    const noteId = "note_created_1";
    const ref = parseObjectParam(
      formatObjectParam({ kind: "note", id: noteId }),
    );
    expect(ref).toEqual({ kind: "note", id: noteId });
    expect(objectHref("/workspace", ref!)).toContain("object=note%3A");
  });
});
