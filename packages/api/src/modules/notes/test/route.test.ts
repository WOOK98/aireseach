/**
 * /api/notes — Route tests (#154)
 *
 * Covers:
 *   1. Unauthenticated → 401 on every verb
 *   2. POST with invalid article payload → 422 (neutral message)
 *   3. PATCH with immutable keys → 400 (strict schema)
 *   4. POST valid → 201, db.insert called with user-scoped values
 *
 * DB and auth are mocked; mapper logic is covered in note-mapper.test.ts.
 */
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { VALID_ARTICLE } from "../../article/test/fixtures/article-fixture";

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

vi.mock("@workspace/db/server", () => ({
  db: {
    insert: (table: unknown) => mockInsert(table),
  },
}));

vi.mock("@workspace/db", () => ({
  and: (...args: unknown[]) => args,
  desc: (col: unknown) => col,
  eq: (...args: unknown[]) => args,
  ilike: (...args: unknown[]) => args,
  or: (...args: unknown[]) => args,
}));

vi.mock("@workspace/db/schema", () => ({
  researchNotes: {},
}));

const { notesRoute } = await import("../route");

const app = new Hono().route("/notes", notesRoute);

const USER = { id: "user_1", email: "u@example.com" };

const post = (body: unknown, headers: Record<string, string> = {}) =>
  app.request("/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("auth", () => {
  it("rejects unauthenticated POST with 401", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await post({ title: "t", article: VALID_ARTICLE });
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated GET with 401", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await app.request("/notes");
    expect(res.status).toBe(401);
  });
});

describe("POST /notes", () => {
  it("returns neutral 422 for invalid article payload", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    const res = await post({ title: "NVDA 研报", article: { bogus: true } });
    expect(res.status).toBe(422);
    const text = await res.text();
    expect(text).toContain("Article payload failed validation.");
  });

  it("inserts user-scoped note with extracted fields on success", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    const row = {
      id: "n1",
      title: "NVDA 研报",
      summary: null,
      note: null,
      tags: [],
      entityTicker: "NVDA",
      entityName: "NVIDIA Corporation",
      artifact: VALID_ARTICLE,
      schemaVersion: 1,
      evidenceIds: ["E1", "E2"],
      asOf: VALID_ARTICLE.entity.dataTimestamp,
      sourceMeta: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockReturning.mockResolvedValue([row]);

    const res = await post({ title: "NVDA 研报", article: VALID_ARTICLE });
    expect(res.status).toBe(201);

    const inserted = mockValues.mock.calls[0]![0] as Record<string, unknown>;
    expect(inserted.userId).toBe("user_1");
    expect(inserted.entityTicker).toBe("NVDA");
    expect(inserted.schemaVersion).toBe(1);
    expect(inserted.asOf).toBe(VALID_ARTICLE.entity.dataTimestamp);
    expect(inserted.artifact).toBeDefined();

    const body = (await res.json()) as { note: { id: string } };
    expect(body.note.id).toBe("n1");
  });
});

describe("PATCH /notes/:id — immutability guard", () => {
  it("rejects artifact key with 400", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    const res = await app.request("/notes/n1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artifact: { hacked: true } }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects asOf key with 400", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    const res = await app.request("/notes/n1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asOf: "2999-01-01" }),
    });
    expect(res.status).toBe(400);
  });
});
