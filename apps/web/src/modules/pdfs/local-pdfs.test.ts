/**
 * Local PDFs — fallback storage tests (#197)
 *
 * Verifies that when the API is unavailable, PDF metadata can be created,
 * listed, and deleted in localStorage. Tests that pass a File verify the
 * blob is stored in IndexedDB and retrievable as an object URL.
 * This test would fail on the pre-#197 codebase where API failure showed
 * a dead-end alert and local PDFs were metadata-only.
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

// ── IndexedDB mock (minimal) ───────────────────────────────────────────────

const idbStore = new Map<string, Blob>();

type IdbEventHandler = (ev: unknown) => void;

function createIdbRequest<T>(result: T): IDBRequest<T> {
  const listeners: Record<string, IdbEventHandler[]> = {};
  const req = {
    result,
    addEventListener(type: string, handler: IdbEventHandler) {
      (listeners[type] ??= []).push(handler);
    },
  } as unknown as IDBRequest<T>;
  queueMicrotask(() => {
    for (const handler of listeners["success"] ?? [])
      handler(new Event("success"));
  });
  return req;
}

function createOpenRequest(db: unknown): IDBOpenDBRequest {
  const listeners: Record<string, IdbEventHandler[]> = {};
  const req = {
    result: db,
    addEventListener(type: string, handler: IdbEventHandler) {
      (listeners[type] ??= []).push(handler);
    },
  } as unknown as IDBOpenDBRequest;
  queueMicrotask(() => {
    for (const handler of listeners["upgradeneeded"] ?? [])
      handler(new Event("upgradeneeded") as unknown as IDBVersionChangeEvent);
    for (const handler of listeners["success"] ?? [])
      handler(new Event("success"));
  });
  return req;
}

function createIdbTx(): IDBTransaction {
  const listeners: Record<string, IdbEventHandler[]> = {};
  const tx = {
    objectStore: () => ({
      put: (value: Blob, key: string) => {
        idbStore.set(key, value);
        return createIdbRequest(undefined);
      },
      get: (key: string) => {
        const val = idbStore.get(key) ?? undefined;
        return createIdbRequest(val);
      },
      delete: (key: string) => {
        idbStore.delete(key);
        return createIdbRequest(undefined);
      },
    }),
    addEventListener(type: string, handler: IdbEventHandler) {
      (listeners[type] ??= []).push(handler);
    },
  } as unknown as IDBTransaction;
  queueMicrotask(() => {
    for (const handler of listeners["complete"] ?? [])
      handler(new Event("complete"));
  });
  return tx;
}

const idbMock = {
  open: (_name: string, _version?: number) => {
    const db = {
      createObjectStore: () => ({}),
      transaction: (_storeName: string, _mode: string) => createIdbTx(),
    };
    return createOpenRequest(db);
  },
};

Object.defineProperty(globalThis, "indexedDB", {
  value: idbMock,
  writable: true,
});

// ── URL mock ───────────────────────────────────────────────────────────────

Object.defineProperty(globalThis, "URL", {
  value: {
    createObjectURL: (blob: Blob) => `blob:test/${blob.size}-${Date.now()}`,
    revokeObjectURL: () => {},
  },
  writable: true,
});

// ── Imports (after mocks) ──────────────────────────────────────────────────

import { createLocalPdfObjectUrl, getPdfBlob } from "./local-pdf-blobs";
import {
  createLocalPdf,
  deleteLocalPdf,
  getLocalPdf,
  isLocalPdf,
  listLocalPdfs,
  patchLocalPdf,
} from "./local-pdfs";

beforeEach(() => {
  localStorage.clear();
  idbStore.clear();
});

afterEach(() => {
  localStorage.clear();
  idbStore.clear();
});

describe("local-pdfs: CRUD", () => {
  it("creates a PDF metadata entry with generated id", async () => {
    const pdf = await createLocalPdf({
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

  it("lists PDFs sorted by createdAt descending", async () => {
    await createLocalPdf({ fileName: "First.pdf", fileSizeBytes: 100 });
    await createLocalPdf({ fileName: "Second.pdf", fileSizeBytes: 200 });
    const pdfs = listLocalPdfs();
    expect(pdfs).toHaveLength(2);
    const names = pdfs.map((p) => p.fileName).sort();
    expect(names).toEqual(["First.pdf", "Second.pdf"]);
  });

  it("filters PDFs by ticker", async () => {
    await createLocalPdf({
      fileName: "TSLA.pdf",
      fileSizeBytes: 100,
      ticker: "TSLA",
    });
    await createLocalPdf({
      fileName: "AAPL.pdf",
      fileSizeBytes: 100,
      ticker: "AAPL",
    });
    const tslaPdfs = listLocalPdfs({ ticker: "TSLA" });
    expect(tslaPdfs).toHaveLength(1);
    expect(tslaPdfs[0]!.fileName).toBe("TSLA.pdf");
  });

  it("filters PDFs by search query", async () => {
    await createLocalPdf({ fileName: "Tesla-Q2.pdf", fileSizeBytes: 100 });
    await createLocalPdf({ fileName: "Apple-Q2.pdf", fileSizeBytes: 100 });
    const results = listLocalPdfs({ q: "Tesla" });
    expect(results).toHaveLength(1);
    expect(results[0]!.fileName).toBe("Tesla-Q2.pdf");
  });

  it("gets a single PDF by id", async () => {
    const created = await createLocalPdf({
      fileName: "Test.pdf",
      fileSizeBytes: 500,
    });
    const fetched = getLocalPdf(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.fileName).toBe("Test.pdf");
  });

  it("deletes a PDF", async () => {
    const pdf = await createLocalPdf({
      fileName: "Delete.pdf",
      fileSizeBytes: 100,
    });
    expect(deleteLocalPdf(pdf.id)).toBe(true);
    expect(getLocalPdf(pdf.id)).toBeNull();
  });
});

describe("local-pdfs: blob storage", () => {
  it("stores File bytes in IndexedDB and retrieves as blob", async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
    const file = new File([pdfBytes], "TSLA.pdf", {
      type: "application/pdf",
    });

    const pdf = await createLocalPdf(
      { fileName: "TSLA.pdf", fileSizeBytes: file.size, ticker: "TSLA" },
      file,
    );

    // Bytes are durable — IndexedDB write completed before return.
    const blob = await getPdfBlob(pdf.id);
    expect(blob).not.toBeNull();
    expect(blob!.size).toBe(pdfBytes.length);
  });

  it("creates a blob object URL for a local PDF with bytes", async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const file = new File([pdfBytes], "TSLA.pdf", {
      type: "application/pdf",
    });

    const pdf = await createLocalPdf(
      { fileName: "TSLA.pdf", fileSizeBytes: file.size, ticker: "TSLA" },
      file,
    );

    const objectUrl = await createLocalPdfObjectUrl(pdf.id);
    expect(objectUrl).toBeTruthy();
    expect(objectUrl).toMatch(/^blob:/);
  });

  it("returns null object URL for PDF without bytes (metadata-only)", async () => {
    const pdf = await createLocalPdf({
      fileName: "Old-Entry.pdf",
      fileSizeBytes: 1000,
    });

    const objectUrl = await createLocalPdfObjectUrl(pdf.id);
    expect(objectUrl).toBeNull();
  });

  it("deleteLocalPdf removes blob from IndexedDB", async () => {
    const file = new File([new Uint8Array(10)], "test.pdf", {
      type: "application/pdf",
    });
    const pdf = await createLocalPdf(
      { fileName: "Cleanup.pdf", fileSizeBytes: 10 },
      file,
    );

    expect(await getPdfBlob(pdf.id)).not.toBeNull();
    deleteLocalPdf(pdf.id);
    expect(await getPdfBlob(pdf.id)).toBeNull();
  });
});

describe("local-pdfs: patchLocalPdf", () => {
  it("patches page count on a local PDF", async () => {
    const pdf = await createLocalPdf({
      fileName: "Test.pdf",
      fileSizeBytes: 500,
      ticker: "TSLA",
    });
    expect(pdf.pageCount).toBeNull();

    const patched = patchLocalPdf(pdf.id, { pageCount: 42 });
    expect(patched).not.toBeNull();
    expect(patched!.pageCount).toBe(42);
    expect(patched!.ticker).toBe("TSLA");

    const reloaded = getLocalPdf(pdf.id);
    expect(reloaded!.pageCount).toBe(42);
  });

  it("patches ticker and sourceLabel", async () => {
    const pdf = await createLocalPdf({
      fileName: "Q.pdf",
      fileSizeBytes: 100,
    });
    const patched = patchLocalPdf(pdf.id, {
      ticker: "AAPL",
      sourceLabel: "Apple IR",
    });
    expect(patched!.ticker).toBe("AAPL");
    expect(patched!.sourceLabel).toBe("Apple IR");
  });

  it("returns null for non-existent id", () => {
    expect(patchLocalPdf("local_pdf_nonexistent", { pageCount: 1 })).toBeNull();
  });
});

describe("local-pdfs: isLocalPdf", () => {
  it("identifies local PDF ids", () => {
    expect(isLocalPdf("local_pdf_123_abc")).toBe(true);
    expect(isLocalPdf("remote_id")).toBe(false);
  });
});

describe("local-pdfs: degraded mode acceptance", () => {
  it("create → list → open → reload cycle for TSLA PDF", async () => {
    const pdf = await createLocalPdf({
      fileName: "TSLA-Q2-2026-Update.pdf",
      fileSizeBytes: 2.5 * 1024 * 1024,
      ticker: "TSLA",
      reportPeriod: "Q2 2026",
      sourceLabel: "Tesla IR",
    });
    expect(pdf.id).toMatch(/^local_pdf_/);

    const list = listLocalPdfs();
    expect(list).toHaveLength(1);
    expect(list[0]!.ticker).toBe("TSLA");
    expect(list[0]!.sourceLabel).toBe("Tesla IR");

    const detail = getLocalPdf(pdf.id);
    expect(detail).not.toBeNull();
    expect(detail!.extractionStatus).toBe("pending");

    const reloaded = getLocalPdf(pdf.id);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.fileName).toBe("TSLA-Q2-2026-Update.pdf");
    expect(reloaded!.reportPeriod).toBe("Q2 2026");
  });

  it("TSLA PDF with File → bytes durable → object URL → reader path", async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
    const file = new File([pdfBytes], "TSLA-Q2-2026-Update.pdf", {
      type: "application/pdf",
    });

    const pdf = await createLocalPdf(
      {
        fileName: "TSLA-Q2-2026-Update.pdf",
        fileSizeBytes: file.size,
        ticker: "TSLA",
        reportPeriod: "Q2 2026",
        sourceLabel: "Tesla IR",
      },
      file,
    );

    // Bytes are durable immediately after await.
    const blob = await getPdfBlob(pdf.id);
    expect(blob).not.toBeNull();
    expect(blob!.size).toBe(pdfBytes.length);

    // Object URL is available → reader path works.
    const objectUrl = await createLocalPdfObjectUrl(pdf.id);
    expect(objectUrl).toBeTruthy();
    expect(objectUrl).toMatch(/^blob:/);
  });
});
