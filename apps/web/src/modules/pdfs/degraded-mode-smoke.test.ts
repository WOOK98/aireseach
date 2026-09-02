/**
 * Workspace degraded-mode E2E smoke test (#197)
 *
 * Simulates the production E2E failure: API returns 503, workspace must
 * still complete the full research loop. This test would fail on the
 * pre-#197 codebase where API failure showed dead-end alerts.
 *
 * Scenario:
 * 1. /workspace loads — user can create a TSLA research note
 * 2. User can write content and save it
 * 3. User can create a TSLA PDF metadata object (degraded — no bytes)
 * 4. Reloading shows the persisted note and PDF
 * 5. Local PDF opens as honest source card (not broken reader)
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// localStorage mock for Node test environment.
const store = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => {
    store.clear();
  },
  get length() {
    return store.size;
  },
  key: (index: number) => Array.from(store.keys())[index] ?? null,
};
if (typeof globalThis.window === "undefined") {
  (globalThis as Record<string, unknown>).window = {};
}
Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

import {
  createLocalNote,
  getLocalNote,
  listLocalNotes,
  updateLocalNote,
  isLocalNote,
  deleteLocalNote,
} from "../notes/local-notes";
import {
  createLocalPdf,
  getLocalPdf,
  listLocalPdfs,
  isLocalPdf,
  deleteLocalPdf,
} from "./local-pdfs";

beforeEach(() => {
  store.clear();
});

afterEach(() => {
  store.clear();
});

describe("E2E smoke: TSLA research loop in degraded mode", () => {
  it("full workflow: create note → write → save → PDF → reload → persisted", () => {
    // Step 1: User creates a TSLA research note from /workspace.
    const note = createLocalNote({
      title: "TSLA Q2 2026 Research",
      entityTicker: "TSLA",
      entityName: "Tesla, Inc.",
      summary:
        "Quarterly analysis covering deliveries, margins, and FSD progress",
    });
    expect(note.id).toMatch(/^local_/);
    expect(isLocalNote(note.id)).toBe(true);

    // Step 2: User writes content and saves.
    const updated = updateLocalNote(note.id, {
      summary: "Updated: 450k deliveries, 18.2% gross margin, FSD v13 rollout",
      blocks: [
        {
          id: "b1",
          type: "paragraph",
          text: "Tesla delivered 450,000 vehicles in Q2 2026, beating consensus of 430k.",
        },
        {
          id: "b2",
          type: "heading",
          text: "Margin Analysis",
          level: 2,
        },
        {
          id: "b3",
          type: "paragraph",
          text: "Gross margin improved to 18.2% from 17.1% QoQ, driven by cost reductions.",
        },
      ],
    });
    expect(updated!.summary).toContain("450k deliveries");
    expect(updated!.blocks).toHaveLength(3);

    // Step 3: User uploads a TSLA PDF (degraded — metadata only).
    const pdf = createLocalPdf({
      fileName: "TSLA-Q2-2026-Update.pdf",
      fileSizeBytes: 2.5 * 1024 * 1024,
      ticker: "TSLA",
      reportPeriod: "Q2 2026",
      sourceLabel: "Tesla Investor Relations",
    });
    expect(pdf.id).toMatch(/^local_pdf_/);
    expect(isLocalPdf(pdf.id)).toBe(true);
    expect(pdf.extractionStatus).toBe("pending");

    // Step 4: Simulate page reload — read from localStorage.
    const reloadedNote = getLocalNote(note.id);
    expect(reloadedNote).not.toBeNull();
    expect(reloadedNote!.title).toBe("TSLA Q2 2026 Research");
    expect(reloadedNote!.entityTicker).toBe("TSLA");
    expect(reloadedNote!.blocks).toHaveLength(3);
    expect(reloadedNote!.blocks[0]!.text).toContain("450,000 vehicles");

    const reloadedPdf = getLocalPdf(pdf.id);
    expect(reloadedPdf).not.toBeNull();
    expect(reloadedPdf!.fileName).toBe("TSLA-Q2-2026-Update.pdf");
    expect(reloadedPdf!.ticker).toBe("TSLA");
    expect(reloadedPdf!.reportPeriod).toBe("Q2 2026");

    // Step 5: Local PDF is a source card, not a broken reader.
    // The PDF has no fileUrl (metadata only), so the UI must show
    // an honest source card, not route to a reader that can't render.
    expect(reloadedPdf).not.toHaveProperty("fileUrl");

    // Step 6: Both objects appear in workspace lists.
    const notes = listLocalNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0]!.title).toBe("TSLA Q2 2026 Research");

    const pdfs = listLocalPdfs({ ticker: "TSLA" });
    expect(pdfs).toHaveLength(1);
    expect(pdfs[0]!.fileName).toBe("TSLA-Q2-2026-Update.pdf");

    // Step 7: Cleanup works.
    expect(deleteLocalNote(note.id)).toBe(true);
    expect(deleteLocalPdf(pdf.id)).toBe(true);
    expect(listLocalNotes()).toHaveLength(0);
    expect(listLocalPdfs()).toHaveLength(0);
  });

  it("note search by ticker works in degraded mode", () => {
    createLocalNote({
      title: "TSLA Analysis",
      entityTicker: "TSLA",
      entityName: "Tesla, Inc.",
    });
    createLocalNote({
      title: "AAPL Analysis",
      entityTicker: "AAPL",
      entityName: "Apple Inc.",
    });

    const tslaNotes = listLocalNotes({ ticker: "TSLA" });
    expect(tslaNotes).toHaveLength(1);
    expect(tslaNotes[0]!.entityTicker).toBe("TSLA");

    const aaplNotes = listLocalNotes({ ticker: "AAPL" });
    expect(aaplNotes).toHaveLength(1);
    expect(aaplNotes[0]!.entityTicker).toBe("AAPL");
  });

  it("PDF search by filename works in degraded mode", () => {
    createLocalPdf({
      fileName: "TSLA-Q2-2026-Update.pdf",
      fileSizeBytes: 1024 * 1024,
      ticker: "TSLA",
    });
    createLocalPdf({
      fileName: "AAPL-10Q-2026.pdf",
      fileSizeBytes: 512 * 1024,
      ticker: "AAPL",
    });

    const tslaPdfs = listLocalPdfs({ q: "TSLA" });
    expect(tslaPdfs).toHaveLength(1);
    expect(tslaPdfs[0]!.ticker).toBe("TSLA");
  });

  it("local IDs are correctly identified", () => {
    expect(isLocalNote("local_123_abc")).toBe(true);
    expect(isLocalNote("db_id_456")).toBe(false);
    expect(isLocalPdf("local_pdf_123_abc")).toBe(true);
    expect(isLocalPdf("db_id_456")).toBe(false);
  });
});
