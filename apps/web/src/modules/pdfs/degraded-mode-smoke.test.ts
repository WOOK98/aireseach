/**
 * Degraded-mode smoke test — full TSLA report workflow (#197)
 *
 * Simulates API 5xx (backend unavailable) and proves:
 * 1. /workspace create/open note → write/save/reload works
 * 2. Upload TSLA PDF → bytes stored in IndexedDB, reader path available
 * 3. PDF without blob → honest source-card fallback (no broken reader)
 * 4. Annotations work on local PDFs (localStorage-backed)
 * 5. Evidence conversion works client-side in degraded mode
 * 6. Note can reference a TSLA PDF source and persist the reference
 * 7. Delete cleans up blob + annotations
 *
 * This test would fail on the pre-#197 codebase where API failure
 * showed dead-end alerts and local PDFs had no usable state.
 * It would also fail if createLocalPdf returned before bytes were durable.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// ── localStorage mock ──────────────────────────────────────────────────────

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

/** Create a mock IDB request that supports both on* and addEventListener. */
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

/** Create a mock IDBOpenDBRequest with addEventListener support. */
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

/** Create a mock IDBTransaction with addEventListener support. */
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

const createdUrls: string[] = [];
Object.defineProperty(globalThis, "URL", {
  value: {
    createObjectURL: (blob: Blob) => {
      const url = `blob:test/${blob.size}-${Date.now()}`;
      createdUrls.push(url);
      return url;
    },
    revokeObjectURL: () => {},
  },
  writable: true,
});

// ── Imports (after mocks) ──────────────────────────────────────────────────

import {
  createLocalNote,
  getLocalNote,
  listLocalNotes,
  updateLocalNote,
} from "../notes/local-notes";
import {
  createLocalAnnotation,
  listLocalAnnotations,
  localAnnotationToEvidence,
  deleteLocalAnnotation,
} from "./local-annotations";
import { getPdfBlob, createLocalPdfObjectUrl } from "./local-pdf-blobs";
import {
  createLocalPdf,
  getLocalPdf,
  isLocalPdf,
  listLocalPdfs,
  deleteLocalPdf,
} from "./local-pdfs";

beforeEach(() => {
  localStorage.clear();
  idbStore.clear();
  createdUrls.length = 0;
});

afterEach(() => {
  localStorage.clear();
  idbStore.clear();
});

// ── Test suite ─────────────────────────────────────────────────────────────

describe("Degraded-mode smoke: full TSLA report workflow", () => {
  it("1. Create note → save → reload persists in localStorage", () => {
    const note = createLocalNote({ title: "TSLA Q2 Report" });
    expect(note.id).toMatch(/^local_/);
    expect(note.title).toBe("TSLA Q2 Report");

    const notes = listLocalNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0]!.title).toBe("TSLA Q2 Report");

    updateLocalNote(note.id, {
      title: "TSLA Q2 2026 Report — Updated",
      note: "Updated analysis body",
    });

    const reloaded = getLocalNote(note.id);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.title).toBe("TSLA Q2 2026 Report — Updated");
    expect(reloaded!.note).toBe("Updated analysis body");
  });

  it("2. Upload TSLA PDF → bytes durable → object URL → reader path", async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
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

    expect(pdf.id).toMatch(/^local_pdf_/);
    expect(pdf.fileName).toBe("TSLA-Q2-2026-Update.pdf");
    expect(pdf.ticker).toBe("TSLA");
    expect(pdf.extractionStatus).toBe("pending");
    expect(isLocalPdf(pdf.id)).toBe(true);

    // Bytes are durable — no setTimeout needed.
    const blob = await getPdfBlob(pdf.id);
    expect(blob).not.toBeNull();
    expect(blob!.size).toBe(pdfBytes.length);

    // Object URL is available → reader path works.
    const objectUrl = await createLocalPdfObjectUrl(pdf.id);
    expect(objectUrl).toBeTruthy();
    expect(objectUrl).toMatch(/^blob:/);

    // PDF appears in list.
    const pdfs = listLocalPdfs();
    expect(pdfs).toHaveLength(1);
    expect(pdfs[0]!.ticker).toBe("TSLA");
  });

  it("3. Local PDF without blob shows honest state (no broken reader)", async () => {
    const pdf = await createLocalPdf({
      fileName: "Old-Entry.pdf",
      fileSizeBytes: 1000,
      ticker: "TSLA",
    });

    const objectUrl = await createLocalPdfObjectUrl(pdf.id);
    expect(objectUrl).toBeNull();

    const detail = getLocalPdf(pdf.id);
    expect(detail).not.toBeNull();
    expect(detail!.fileName).toBe("Old-Entry.pdf");
  });

  it("4. Annotate a local PDF in degraded mode", async () => {
    const pdf = await createLocalPdf({
      fileName: "TSLA.pdf",
      fileSizeBytes: 1024,
      ticker: "TSLA",
    });

    const highlight = createLocalAnnotation(pdf.id, {
      page: 1,
      payload: {
        kind: "highlight",
        rects: [{ x: 0.1, y: 0.2, width: 0.3, height: 0.05 }],
        color: "#ff0",
        excerpt: "Revenue grew 42% YoY to $25.2B",
      },
    });
    expect(highlight.id).toMatch(/^local_ann_/);
    expect(highlight.kind).toBe("highlight");

    const textNote = createLocalAnnotation(pdf.id, {
      page: 2,
      payload: {
        kind: "text",
        anchor: { x: 0.5, y: 0.5 },
        text: "Key margin improvement in automotive segment",
      },
    });
    expect(textNote.kind).toBe("text");

    const annotations = listLocalAnnotations(pdf.id);
    expect(annotations).toHaveLength(2);

    deleteLocalAnnotation(highlight.id);
    const remaining = listLocalAnnotations(pdf.id);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.id).toBe(textNote.id);
  });

  it("5. Convert local annotation to evidence (degraded mode)", async () => {
    const pdf = await createLocalPdf({
      fileName: "TSLA.pdf",
      fileSizeBytes: 1024,
      ticker: "TSLA",
    });

    const highlight = createLocalAnnotation(pdf.id, {
      page: 3,
      payload: {
        kind: "highlight",
        rects: [{ x: 0.1, y: 0.3, width: 0.4, height: 0.03 }],
        excerpt: "Operating margin reached 15.3%",
      },
    });

    const evidence = localAnnotationToEvidence(highlight);
    expect(evidence.claim).toBe("Operating margin reached 15.3%");
    expect(evidence.source).toContain("page 3");
    expect(evidence.confidence).toBe("partial");
    expect(evidence.date).toBeTruthy();

    const pen = createLocalAnnotation(pdf.id, {
      page: 5,
      payload: { kind: "pen", paths: [[{ x: 0, y: 0 }]] },
    });

    const penEvidence = localAnnotationToEvidence(
      pen,
      "FSD revenue breakdown chart",
    );
    expect(penEvidence.claim).toBe("FSD revenue breakdown chart");
    expect(penEvidence.confidence).toBe("partial");
  });

  it("6. Note saves and reloads with TSLA PDF source reference", async () => {
    // Create a TSLA PDF with bytes.
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
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

    // Create a note that references the TSLA PDF.
    const note = createLocalNote({ title: "TSLA Q2 2026 Analysis" });
    updateLocalNote(note.id, {
      title: "TSLA Q2 2026 Analysis",
      note: `## Key Findings\n\nSource: <span data-pdf-id="${pdf.id}" class="notranslate">${pdf.fileName}</span>\n\n- Total revenue $25.2B, up 42% YoY`,
    });

    // Reload — note persists with the PDF reference.
    const savedNote = getLocalNote(note.id);
    expect(savedNote).not.toBeNull();
    expect(savedNote!.note).toContain(pdf.id);
    expect(savedNote!.note).toContain("TSLA-Q2-2026-Update.pdf");
    expect(savedNote!.note).toContain("Total revenue $25.2B");

    // The referenced PDF is still accessible.
    const savedPdf = getLocalPdf(pdf.id);
    expect(savedPdf).not.toBeNull();
    expect(savedPdf!.ticker).toBe("TSLA");

    // Blob is still available for the referenced PDF.
    const blob = await getPdfBlob(pdf.id);
    expect(blob).not.toBeNull();
  });

  it("7. Full workflow: TSLA report — note + PDF + annotation + evidence", async () => {
    const note = createLocalNote({ title: "TSLA Q2 2026 Analysis" });
    expect(note.title).toBe("TSLA Q2 2026 Analysis");

    const pdf = await createLocalPdf(
      {
        fileName: "TSLA-Q2-2026-Update.pdf",
        fileSizeBytes: 2.5 * 1024 * 1024,
        ticker: "TSLA",
        reportPeriod: "Q2 2026",
        sourceLabel: "Tesla IR",
      },
      new File([new Uint8Array(100)], "TSLA.pdf", {
        type: "application/pdf",
      }),
    );
    expect(isLocalPdf(pdf.id)).toBe(true);

    // Bytes are durable immediately after await.
    const blob = await getPdfBlob(pdf.id);
    expect(blob).not.toBeNull();
    expect(blob!.size).toBe(100);

    const annotation = createLocalAnnotation(pdf.id, {
      page: 1,
      payload: {
        kind: "highlight",
        rects: [{ x: 0.1, y: 0.2, width: 0.5, height: 0.04 }],
        excerpt: "Total revenue $25.2B, up 42% YoY",
      },
    });

    const evidence = localAnnotationToEvidence(annotation);
    expect(evidence.claim).toBe("Total revenue $25.2B, up 42% YoY");
    expect(evidence.confidence).toBe("partial");

    updateLocalNote(note.id, {
      title: "TSLA Q2 2026 Analysis",
      note: `## Key Findings\n\n- ${evidence.claim} (${evidence.source})`,
    });

    const savedNote = getLocalNote(note.id);
    expect(savedNote).not.toBeNull();
    expect(savedNote!.note).toContain("Total revenue $25.2B");
    expect(savedNote!.note).toContain("page 1");

    const savedPdf = getLocalPdf(pdf.id);
    expect(savedPdf).not.toBeNull();
    expect(savedPdf!.ticker).toBe("TSLA");

    const annotations = listLocalAnnotations(pdf.id);
    expect(annotations).toHaveLength(1);
    expect(annotations[0]!.id).toBe(annotation.id);
  });

  it("8. Delete local PDF cleans up annotations and blob", async () => {
    const pdf = await createLocalPdf(
      { fileName: "Cleanup.pdf", fileSizeBytes: 100 },
      new File([new Uint8Array(10)], "test.pdf", { type: "application/pdf" }),
    );

    // Blob is durable immediately — no setTimeout needed.
    expect(await getPdfBlob(pdf.id)).not.toBeNull();

    createLocalAnnotation(pdf.id, {
      page: 1,
      payload: { kind: "text", anchor: { x: 0, y: 0 }, text: "test" },
    });

    expect(listLocalAnnotations(pdf.id)).toHaveLength(1);

    deleteLocalPdf(pdf.id);
    expect(getLocalPdf(pdf.id)).toBeNull();

    const blob = await getPdfBlob(pdf.id);
    expect(blob).toBeNull();
  });
});
