/**
 * /api/pdfs — Route tests (knife-2 slice 1)
 *
 * Covers:
 *   1. Unauthenticated → 401 on every verb
 *   2. POST validation: non-PDF name → 400, oversize → 400
 *   3. POST success → 201, insert values are user-scoped, blobKey derived
 *      server-side, uploadUrl returned
 *   4. Storage failure on create → 502 + row rollback
 *   5. PATCH with immutable keys → 400 (strict schema)
 *   6. Annotation create: kind derived from payload; invalid payload → 400
 *   7. Slice 2 (#162): to-evidence (highlight excerpt / pen claim rules,
 *      user isolation) and extract (done/truncated/failed, fail-open)
 *
 * DB, auth and storage are mocked; mapper logic is in pdf-mapper.test.ts.
 */
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn<(...args: unknown[]) => Promise<unknown>>();

vi.mock("@workspace/auth/server", () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

const mockReturning = vi.fn<(...args: unknown[]) => Promise<unknown[]>>();
const mockValues = vi.fn<
  (values: unknown) => { returning: typeof mockReturning }
>(() => ({
  returning: mockReturning,
}));
const mockInsert = vi.fn<(table: unknown) => { values: typeof mockValues }>(
  () => ({
    values: mockValues,
  }),
);
const mockDeleteWhere = vi.fn<(...args: unknown[]) => Promise<unknown[]>>();
const mockDelete = vi.fn<(table: unknown) => { where: typeof mockDeleteWhere }>(
  () => ({ where: mockDeleteWhere }),
);

// select().from(t).where(...).limit(n) → rows
// list additionally chains .orderBy(...).limit(...).offset(...)
const mockSelectOffset = vi.fn<(...args: unknown[]) => Promise<unknown[]>>();
const mockSelectListLimit = vi.fn<
  (...args: unknown[]) => { offset: typeof mockSelectOffset }
>(() => ({ offset: mockSelectOffset }));
const mockSelectOrderBy = vi.fn<
  (...args: unknown[]) => { limit: typeof mockSelectListLimit }
>(() => ({ limit: mockSelectListLimit }));
const mockSelectLimit = vi.fn<(...args: unknown[]) => Promise<unknown[]>>();
const mockSelectWhere = vi.fn<
  (...args: unknown[]) => {
    limit: typeof mockSelectLimit;
    orderBy: typeof mockSelectOrderBy;
  }
>(() => ({ limit: mockSelectLimit, orderBy: mockSelectOrderBy }));
const mockSelectFrom = vi.fn<
  (table: unknown) => { where: typeof mockSelectWhere }
>(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn<() => { from: typeof mockSelectFrom }>(() => ({
  from: mockSelectFrom,
}));

// update(t).set(v).where(...) → void
const mockUpdateWhere = vi
  .fn<(...args: unknown[]) => Promise<unknown[]>>()
  .mockResolvedValue([]);
const mockUpdateSet = vi.fn<
  (values: unknown) => { where: typeof mockUpdateWhere }
>(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn<(table: unknown) => { set: typeof mockUpdateSet }>(
  () => ({ set: mockUpdateSet }),
);

vi.mock("@workspace/db/server", () => ({
  db: {
    insert: (table: unknown) => mockInsert(table),
    delete: (table: unknown) => mockDelete(table),
    select: () => mockSelect(),
    update: (table: unknown) => mockUpdate(table),
  },
}));

vi.mock("@workspace/db", () => ({
  and: (...args: unknown[]) => args,
  asc: (col: unknown) => col,
  desc: (col: unknown) => col,
  eq: (...args: unknown[]) => args,
  ilike: (...args: unknown[]) => args,
  or: (...args: unknown[]) => args,
}));

vi.mock("@workspace/db/schema", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@workspace/db/schema")>();
  return {
    ...original,
    researchPdfs: { id: "id", userId: "user_id" },
    pdfAnnotations: { id: "id", pdfId: "pdf_id", userId: "user_id" },
  };
});

const mockGetUploadUrl = vi.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetSignedUrl = vi.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetDeleteUrl = vi.fn<(...args: unknown[]) => Promise<unknown>>();

vi.mock("@workspace/storage/server", () => ({
  getUploadUrl: (...args: unknown[]) => mockGetUploadUrl(...args),
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
  getDeleteUrl: (...args: unknown[]) => mockGetDeleteUrl(...args),
}));

// pdfjs-dist extraction is mocked at the module boundary — the real parser
// is covered by pdf-extract.test.ts against a real PDF fixture.
const mockExtractPdfText = vi.fn<(...args: unknown[]) => Promise<unknown>>();
vi.mock("../pdf-extract", () => ({
  extractPdfText: (...args: unknown[]) => mockExtractPdfText(...args),
}));

const { pdfsRoute, pdfAnnotationsRoute } = await import("../route");

const app = new Hono()
  .route("/pdfs", pdfsRoute)
  .route("/pdfs/annotations", pdfAnnotationsRoute);

const USER = { id: "user_1", email: "u@example.com" };

const post = (body: unknown) =>
  app.request("/pdfs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("auth", () => {
  it("rejects unauthenticated requests with 401", async () => {
    mockGetSession.mockResolvedValue(null);
    expect((await post({ fileName: "a.pdf", fileSizeBytes: 1 })).status).toBe(
      401,
    );
    expect((await app.request("/pdfs")).status).toBe(401);
    expect((await app.request("/pdfs/p1")).status).toBe(401);
    expect(
      (
        await app.request("/pdfs/p1/annotations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page: 1,
            payload: {
              kind: "highlight",
              rects: [{ x: 0.1, y: 0.2, width: 0.3, height: 0.05 }],
            },
          }),
        })
      ).status,
    ).toBe(401);
  });
});

describe("POST /pdfs — validation", () => {
  it("rejects non-PDF file names with 400", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    const res = await post({ fileName: "evil.exe", fileSizeBytes: 100 });
    expect(res.status).toBe(400);
  });

  it("rejects files over the size cap with 400", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    const res = await post({
      fileName: "big.pdf",
      fileSizeBytes: 51 * 1024 * 1024,
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /pdfs — success path", () => {
  it("inserts a user-scoped row with server-derived blobKey + uploadUrl", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    mockReturning.mockImplementation(async () => [
      {
        id: "generated-id",
        fileName: "NVDA-Q2.pdf",
        blobKey: "pdfs/user_1/generated-id.pdf",
        fileSizeBytes: 2048,
        pageCount: null,
        ticker: "NVDA",
        reportPeriod: null,
        sourceLabel: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    mockGetUploadUrl.mockResolvedValue({ url: "https://s3/presigned-put" });

    const res = await post({
      fileName: "NVDA-Q2.pdf",
      fileSizeBytes: 2048,
      ticker: "NVDA",
    });
    expect(res.status).toBe(201);

    const inserted = mockValues.mock.calls[0]![0] as Record<string, unknown>;
    expect(inserted.userId).toBe("user_1");
    expect(inserted.blobKey).toMatch(/^pdfs\/user_1\/.+\.pdf$/);

    // Upload URL requested for the same server-derived key, with the MIME
    // whitelist pinned into the signature (application/pdf only).
    expect(mockGetUploadUrl).toHaveBeenCalledWith({
      path: inserted.blobKey,
      contentType: "application/pdf",
    });

    const body = (await res.json()) as {
      pdf: Record<string, unknown>;
      uploadUrl: string;
    };
    expect(body.uploadUrl).toBe("https://s3/presigned-put");
    expect(body.pdf).not.toHaveProperty("blobKey");
  });

  it("pins the presigned upload URL to application/pdf", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    mockReturning.mockImplementation(async () => [
      {
        id: "generated-id",
        fileName: "a.pdf",
        blobKey: "pdfs/user_1/generated-id.pdf",
        fileSizeBytes: 1,
        pageCount: null,
        ticker: null,
        reportPeriod: null,
        sourceLabel: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    mockGetUploadUrl.mockResolvedValue({ url: "https://s3/presigned-put" });

    const res = await post({ fileName: "a.pdf", fileSizeBytes: 1 });
    expect(res.status).toBe(201);

    // MIME whitelist must be enforced at the signed upload boundary, not
    // just by file-name validation: storage is asked to sign a PUT that
    // only accepts Content-Type: application/pdf.
    expect(mockGetUploadUrl).toHaveBeenCalledTimes(1);
    const arg = mockGetUploadUrl.mock.calls[0]![0] as Record<string, unknown>;
    expect(arg.contentType).toBe("application/pdf");
    expect(arg.path).toMatch(/^pdfs\/user_1\/.+\.pdf$/);
  });

  it("rolls back the row and returns 502 when storage is unavailable", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    mockReturning.mockResolvedValue([
      {
        id: "generated-id",
        fileName: "a.pdf",
        blobKey: "pdfs/user_1/generated-id.pdf",
        fileSizeBytes: 1,
        pageCount: null,
        ticker: null,
        reportPeriod: null,
        sourceLabel: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    mockGetUploadUrl.mockRejectedValue(new Error("s3 down"));
    mockDeleteWhere.mockResolvedValue([]);

    const res = await post({ fileName: "a.pdf", fileSizeBytes: 1 });
    expect(res.status).toBe(502);
    expect(mockDelete).toHaveBeenCalled(); // rollback happened
  });
});

describe("PATCH /pdfs/:id — strict schema", () => {
  it("rejects immutable keys with 400", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    const res = await app.request("/pdfs/p1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blobKey: "pdfs/other/x.pdf" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /pdfs/:id/annotations", () => {
  it("rejects invalid payloads with 400", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    const res = await app.request("/pdfs/p1/annotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: 1, payload: { kind: "arrow" } }),
    });
    expect(res.status).toBe(400);
  });
});

// ── Slice 2 (#162): to-evidence + extract ────────────────────────────────────

const PDF_ROW = {
  id: "p1",
  userId: "user_1",
  fileName: "NVDA-Q2-2026.pdf",
  blobKey: "pdfs/user_1/p1.pdf",
  fileSizeBytes: 2048,
  pageCount: 12,
  ticker: "NVDA",
  reportPeriod: "2026Q2",
  sourceLabel: null,
  extractionStatus: "pending" as const,
  createdAt: new Date("2026-08-20T00:00:00Z"),
  updatedAt: new Date("2026-08-20T00:00:00Z"),
};

const HIGHLIGHT_ROW = {
  id: "a1",
  pdfId: "p1",
  userId: "user_1",
  page: 7,
  kind: "highlight" as const,
  payload: {
    kind: "highlight" as const,
    rects: [{ x: 0.1, y: 0.1, width: 0.5, height: 0.05 }],
    excerpt: "数据中心营收 263 亿美元",
  },
  createdAt: new Date("2026-08-20T00:00:00Z"),
  updatedAt: new Date("2026-08-20T00:00:00Z"),
};

const postToEvidence = (body: unknown) =>
  app.request("/pdfs/p1/annotations/a1/to-evidence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /pdfs/:pdfId/annotations/:annotationId/to-evidence", () => {
  it("rejects unauthenticated requests with 401", async () => {
    mockGetSession.mockResolvedValue(null);
    expect((await postToEvidence({})).status).toBe(401);
  });

  it("highlight with excerpt → EvidenceRef snapshot", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    mockSelectLimit
      .mockResolvedValueOnce([PDF_ROW]) // requireOwnedPdf
      .mockResolvedValueOnce([HIGHLIGHT_ROW]); // annotation fetch

    const res = await postToEvidence({});
    expect(res.status).toBe(200);
    const body = (await res.json()) as { evidence: Record<string, unknown> };
    expect(body.evidence).toEqual({
      id: "pdf_p1_ann_a1",
      claim: "数据中心营收 263 亿美元",
      source: "NVDA-Q2-2026.pdf p.7",
      date: "2026Q2",
      confidence: "partial",
    });
    // No public URL — redline: signed URLs only, never persisted links.
    expect(body.evidence).not.toHaveProperty("url");
  });

  it("explicit claim overrides the excerpt", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    mockSelectLimit
      .mockResolvedValueOnce([PDF_ROW])
      .mockResolvedValueOnce([HIGHLIGHT_ROW]);

    const res = await postToEvidence({ claim: "管理层指引偏保守" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { evidence: { claim: string } };
    expect(body.evidence.claim).toBe("管理层指引偏保守");
  });

  it("pen annotation without claim → 400", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    mockSelectLimit.mockResolvedValueOnce([PDF_ROW]).mockResolvedValueOnce([
      {
        ...HIGHLIGHT_ROW,
        payload: {
          kind: "pen",
          paths: [
            [
              { x: 0, y: 0 },
              { x: 1, y: 1 },
            ],
          ],
        },
      },
    ]);

    const res = await postToEvidence({});
    expect(res.status).toBe(400);
  });

  it("404 when the annotation belongs to another user/pdf", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    mockSelectLimit.mockResolvedValueOnce([PDF_ROW]).mockResolvedValueOnce([]); // ownership filter → no row

    const res = await postToEvidence({});
    expect(res.status).toBe(404);
  });
});

describe("POST /pdfs/:id/extract", () => {
  const postExtract = () => app.request("/pdfs/p1/extract", { method: "POST" });

  it("rejects unauthenticated requests with 401", async () => {
    mockGetSession.mockResolvedValue(null);
    expect((await postExtract()).status).toBe(401);
  });

  it("success → extractionStatus done, text + timestamp persisted", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    mockSelectLimit.mockResolvedValueOnce([PDF_ROW]);
    mockGetSignedUrl.mockResolvedValue({ url: "https://s3/signed-get" });
    const mockFetch = vi
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      });
    vi.stubGlobal("fetch", mockFetch);
    mockExtractPdfText.mockResolvedValue({
      text: "营收 263 亿美元",
      pageCount: 12,
      truncated: false,
    });

    const res = await postExtract();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toEqual({
      extractionStatus: "done",
      pageCount: 12,
      chars: 10,
    });

    const setArg = mockUpdateSet.mock.calls[0]![0] as Record<string, unknown>;
    expect(setArg.extractionStatus).toBe("done");
    expect(setArg.extractedText).toBe("营收 263 亿美元");
    expect(setArg.extractedAt).toBeInstanceOf(Date);

    vi.unstubAllGlobals();
  });

  it("truncated result → extractionStatus truncated", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    mockSelectLimit.mockResolvedValueOnce([PDF_ROW]);
    mockGetSignedUrl.mockResolvedValue({ url: "https://s3/signed-get" });
    const mockFetch = vi
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new Uint8Array([1]).buffer,
      });
    vi.stubGlobal("fetch", mockFetch);
    mockExtractPdfText.mockResolvedValue({
      text: "partial text",
      pageCount: 500,
      truncated: true,
    });

    const res = await postExtract();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.extractionStatus).toBe("truncated");

    const setArg = mockUpdateSet.mock.calls[0]![0] as Record<string, unknown>;
    expect(setArg.extractionStatus).toBe("truncated");

    vi.unstubAllGlobals();
  });

  it("fail-open: parse failure → 200 + status failed, no text stored", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    mockSelectLimit.mockResolvedValueOnce([PDF_ROW]);
    mockGetSignedUrl.mockResolvedValue({ url: "https://s3/signed-get" });
    const mockFetch = vi
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new Uint8Array([1]).buffer,
      });
    vi.stubGlobal("fetch", mockFetch);
    mockExtractPdfText.mockRejectedValue(new Error("Invalid PDF structure"));

    const res = await postExtract();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toEqual({ extractionStatus: "failed" });

    const setArg = mockUpdateSet.mock.calls[0]![0] as Record<string, unknown>;
    expect(setArg.extractionStatus).toBe("failed");
    expect(setArg.extractedText).toBeNull();

    vi.unstubAllGlobals();
  });
});

// ── P0 (#195): DB failure sanitization ─────────────────────────────────────
//
// Production leaked raw Drizzle `Failed query: ... params: ...` text when
// the research_pdfs migrations were missing. The guard must convert any
// unexpected DB error into a neutral 503 — no SQL, params, table names or
// file names in the response.

const drizzleError = (sql: string) =>
  new Error(`Failed query: ${sql} params: ["user_1","NVDA-Q2.pdf"]`);

describe("DB failure sanitization (#195)", () => {
  it("GET /pdfs list failure → 503 neutral, no raw SQL/params", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    mockSelectOffset.mockRejectedValueOnce(
      drizzleError('select "id", "file_name" from "research_pdfs"'),
    );

    const res = await app.request("/pdfs");
    expect(res.status).toBe(503);
    const text = await res.text();
    expect(text).toContain("temporarily unavailable");
    expect(text).not.toContain("Failed query");
    expect(text).not.toContain("research_pdfs");
    expect(text).not.toContain("params");
    expect(text).not.toContain("NVDA-Q2.pdf");
  });

  it("POST /pdfs insert failure → 503 neutral, no raw SQL/params", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    mockReturning.mockRejectedValueOnce(
      drizzleError('insert into "research_pdfs" ("id", "file_name")'),
    );

    const res = await post({ fileName: "a.pdf", fileSizeBytes: 1 });
    expect(res.status).toBe(503);
    const text = await res.text();
    expect(text).toContain("temporarily unavailable");
    expect(text).not.toContain("Failed query");
    expect(text).not.toContain("research_pdfs");
    expect(text).not.toContain("params");
    expect(text).not.toContain("a.pdf");
  });

  it("list success still works with the orderBy chain", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    mockSelectOffset.mockResolvedValueOnce([PDF_ROW]);

    const res = await app.request("/pdfs");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { pdfs: Record<string, unknown>[] };
    expect(body.pdfs).toHaveLength(1);
    expect(body.pdfs[0]).not.toHaveProperty("blobKey");
  });
});
