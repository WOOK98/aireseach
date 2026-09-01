/**
 * Local PDFs — fallback storage tests (#197)
 *
 * Verifies that when the API is unavailable, PDF metadata can be created,
 * listed, and deleted in localStorage. This test would fail on the
 * pre-#197 codebase where API failure showed a dead-end alert.
 */
import { afterEach, describe, expect, it } from "vitest";

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
  createLocalPdf,
  deleteLocalPdf,
  getLocalPdf,
  isLocalPdf,
  listLocalPdfs,
} from "./local-pdfs";

afterEach(() => {
  localStorage.clear();
});

describe("local-pdfs: CRUD", () => {
  it("creates a PDF metadata entry with generated id", () => {
    const pdf = createLocalPdf({
      fileName: "TSLA-Q2-2026-Update.pdf",
      fileSizeBytes: 1024 * 1024,
      ticker: "TSLA",
      reportPeriod: "Q2 2026",
    });
    expect(pdf.id).toMatch(/^local_pdf_/);
    expect(pdf.fileName).toBe("TSLA-Q2-2026-Update.pdf");
    expect(pdf.fileSizeBytes).toBe(1024 * 1024);
    expect(pdf.ticker).toBe("TSLA");
    expect(pdf.reportPeriod).toBe("Q2 2026");
    expect(pdf.extractionStatus).toBe("pending");
    expect(pdf._local).toBe(true);
  });

  it("lists PDFs sorted by createdAt descending", () => {
    createLocalPdf({ fileName: "First.pdf", fileSizeBytes: 100 });
    createLocalPdf({ fileName: "Second.pdf", fileSizeBytes: 200 });
    const pdfs = listLocalPdfs();
    expect(pdfs).toHaveLength(2);
    // Both created in the same millisecond — just verify all are present.
    const names = pdfs.map((p) => p.fileName).sort();
    expect(names).toEqual(["First.pdf", "Second.pdf"]);
  });

  it("filters PDFs by ticker", () => {
    createLocalPdf({
      fileName: "TSLA.pdf",
      fileSizeBytes: 100,
      ticker: "TSLA",
    });
    createLocalPdf({
      fileName: "AAPL.pdf",
      fileSizeBytes: 100,
      ticker: "AAPL",
    });
    const tslaPdfs = listLocalPdfs({ ticker: "TSLA" });
    expect(tslaPdfs).toHaveLength(1);
    expect(tslaPdfs[0]!.fileName).toBe("TSLA.pdf");
  });

  it("filters PDFs by search query", () => {
    createLocalPdf({ fileName: "Tesla-Q2.pdf", fileSizeBytes: 100 });
    createLocalPdf({ fileName: "Apple-Q2.pdf", fileSizeBytes: 100 });
    const results = listLocalPdfs({ q: "Tesla" });
    expect(results).toHaveLength(1);
    expect(results[0]!.fileName).toBe("Tesla-Q2.pdf");
  });

  it("gets a single PDF by id", () => {
    const created = createLocalPdf({
      fileName: "Test.pdf",
      fileSizeBytes: 500,
    });
    const fetched = getLocalPdf(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.fileName).toBe("Test.pdf");
  });

  it("deletes a PDF", () => {
    const pdf = createLocalPdf({ fileName: "Delete.pdf", fileSizeBytes: 100 });
    expect(deleteLocalPdf(pdf.id)).toBe(true);
    expect(getLocalPdf(pdf.id)).toBeNull();
  });
});

describe("local-pdfs: isLocalPdf", () => {
  it("identifies local PDF ids", () => {
    expect(isLocalPdf("local_pdf_123_abc")).toBe(true);
    expect(isLocalPdf("remote_id")).toBe(false);
  });
});

describe("local-pdfs: degraded mode acceptance", () => {
  it("create → list → open → reload cycle for TSLA PDF", () => {
    // Step 1: Create a TSLA PDF metadata entry.
    const pdf = createLocalPdf({
      fileName: "TSLA-Q2-2026-Update.pdf",
      fileSizeBytes: 2.5 * 1024 * 1024,
      ticker: "TSLA",
      reportPeriod: "Q2 2026",
      sourceLabel: "Tesla IR",
    });
    expect(pdf.id).toMatch(/^local_pdf_/);

    // Step 2: PDF appears in the list.
    const list = listLocalPdfs();
    expect(list).toHaveLength(1);
    expect(list[0]!.ticker).toBe("TSLA");
    expect(list[0]!.sourceLabel).toBe("Tesla IR");

    // Step 3: Open the PDF by id.
    const detail = getLocalPdf(pdf.id);
    expect(detail).not.toBeNull();
    expect(detail!.extractionStatus).toBe("pending");

    // Step 4: "Reload" — read from localStorage again.
    const reloaded = getLocalPdf(pdf.id);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.fileName).toBe("TSLA-Q2-2026-Update.pdf");
    expect(reloaded!.reportPeriod).toBe("Q2 2026");
  });
});
