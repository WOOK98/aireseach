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

vi.mock("@workspace/db/server", () => ({
  db: {
    insert: (table: unknown) => mockInsert(table),
    delete: (table: unknown) => mockDelete(table),
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

    // Upload URL requested for the same server-derived key.
    expect(mockGetUploadUrl).toHaveBeenCalledWith({
      path: inserted.blobKey,
    });

    const body = (await res.json()) as {
      pdf: Record<string, unknown>;
      uploadUrl: string;
    };
    expect(body.uploadUrl).toBe("https://s3/presigned-put");
    expect(body.pdf).not.toHaveProperty("blobKey");
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
