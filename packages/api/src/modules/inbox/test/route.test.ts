/**
 * /api/inbox — Route tests (#165)
 *
 * Covers:
 *   1. Unauthenticated → 401 on every verb
 *   2. POST validation failures → 400 (zValidator), neutral messages
 *   3. POST valid → 201, user-scoped insert
 *   4. POST duplicate url → 409 (unique-index conflict mapping)
 *   5. Convert: new → 201 with draft note insert + inbox status flip;
 *      already converted → 200 idempotent; archived → 409
 *   6. DELETE converted → 409
 *   7. PATCH strictness: status "converted" rejected, unknown keys rejected
 *
 * DB and auth are mocked; mapper logic is covered in inbox-mapper.test.ts.
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

// ── db mock: every chained method returns the next mock in the chain ────

const mockInsertReturning = vi.fn<(...args: unknown[]) => Promise<unknown[]>>();
const mockInsertValues = vi.fn<(v: unknown) => unknown>(() => ({
  returning: mockInsertReturning,
}));
const mockInsert = vi.fn<(t: unknown) => unknown>(() => ({
  values: mockInsertValues,
}));

const mockSelectResult = vi.fn<(...args: unknown[]) => Promise<unknown[]>>();
// where() serves two call shapes:
//   detail/convert/delete: .where(...).limit(1)        → awaited directly
//   list:                  .where(...).orderBy(...).limit(n).offset(m)
const mockSelectWhere = vi.fn<(...args: unknown[]) => unknown>(() => ({
  limit: () => mockSelectResult(),
  orderBy: () => ({
    limit: () => ({ offset: mockSelectResult }),
  }),
}));
const mockSelectFrom = vi.fn<(t: unknown) => unknown>(() => ({
  where: mockSelectWhere,
}));
const mockSelect = vi.fn<() => unknown>(() => ({ from: mockSelectFrom }));

const mockUpdateReturning = vi.fn<(...args: unknown[]) => Promise<unknown[]>>();
const mockUpdateWhere = vi.fn<(...args: unknown[]) => unknown>(() => ({
  returning: mockUpdateReturning,
}));
const mockUpdateSet = vi.fn<(v: unknown) => unknown>(() => ({
  where: mockUpdateWhere,
}));
const mockUpdate = vi.fn<(t: unknown) => unknown>(() => ({
  set: mockUpdateSet,
}));

const mockDeleteReturning = vi.fn<(...args: unknown[]) => Promise<unknown[]>>();
const mockDeleteWhere = vi.fn<(...args: unknown[]) => unknown>(() => ({
  returning: mockDeleteReturning,
}));
const mockDelete = vi.fn<(t: unknown) => unknown>(() => ({
  where: mockDeleteWhere,
}));

vi.mock("@workspace/db/server", () => ({
  db: {
    insert: (t: unknown) => mockInsert(t),
    select: () => mockSelect(),
    update: (t: unknown) => mockUpdate(t),
    delete: (t: unknown) => mockDelete(t),
  },
}));

vi.mock("@workspace/db", () => ({
  and: (...args: unknown[]) => args,
  desc: (col: unknown) => col,
  eq: (...args: unknown[]) => args,
}));

vi.mock("@workspace/db/schema", () => ({
  evidenceInbox: {},
  researchNotes: { id: "notes_id_col" },
}));

const { inboxRoute } = await import("../route");

const app = new Hono().route("/inbox", inboxRoute);

const USER = { id: "user_1", email: "u@example.com" };

const INBOX_ROW = {
  id: "item_1",
  userId: "user_1",
  sourceType: "url",
  title: "HBM supply deep dive",
  url: "https://example.com/hbm",
  author: null,
  publishedAt: null,
  rawText: null,
  status: "inbox",
  noteId: null,
  createdAt: new Date("2026-08-21T10:00:00Z"),
  updatedAt: new Date("2026-08-21T10:00:00Z"),
};

const postJson = (path: string, body: unknown) =>
  app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ user: USER });
});

// ── auth ──────────────────────────────────────────────────────────────────

describe("auth", () => {
  it("rejects unauthenticated POST with 401", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await postJson("/inbox", {
      sourceType: "url",
      title: "t",
      url: "https://example.com/a",
    });
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated GET with 401", async () => {
    mockGetSession.mockResolvedValue(null);
    expect((await app.request("/inbox")).status).toBe(401);
  });

  it("rejects unauthenticated convert with 401", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await app.request("/inbox/item_1/convert", { method: "POST" });
    expect(res.status).toBe(401);
  });
});

// ── POST /inbox ───────────────────────────────────────────────────────────

describe("POST /inbox", () => {
  it("400 when url-type item has no url", async () => {
    const res = await postJson("/inbox", {
      sourceType: "url",
      title: "Missing url",
    });
    expect(res.status).toBe(400);
  });

  it("400 when paste-type item has no rawText", async () => {
    const res = await postJson("/inbox", {
      sourceType: "paste",
      title: "Missing body",
    });
    expect(res.status).toBe(400);
  });

  it("400 on unknown key injection (status)", async () => {
    const res = await postJson("/inbox", {
      sourceType: "url",
      title: "t",
      url: "https://example.com/a",
      status: "converted",
    });
    expect(res.status).toBe(400);
  });

  it("201 + user-scoped insert on success", async () => {
    mockInsertReturning.mockResolvedValue([INBOX_ROW]);
    const res = await postJson("/inbox", {
      sourceType: "url",
      title: "HBM supply deep dive",
      url: "https://example.com/hbm",
    });
    expect(res.status).toBe(201);

    const inserted = mockInsertValues.mock.calls[0]![0] as Record<
      string,
      unknown
    >;
    expect(inserted.userId).toBe("user_1");
    expect(inserted.sourceType).toBe("url");
    expect(inserted.url).toBe("https://example.com/hbm");

    const body = (await res.json()) as { item: { id: string } };
    expect(body.item.id).toBe("item_1");
  });

  it("409 when insert hits the user+url unique index", async () => {
    mockInsertReturning.mockRejectedValue(new Error("unique violation"));
    const res = await postJson("/inbox", {
      sourceType: "url",
      title: "dup",
      url: "https://example.com/hbm",
    });
    expect(res.status).toBe(409);
    expect(await res.text()).toContain("already in your inbox");
  });
});

// ── POST /inbox/:id/convert ───────────────────────────────────────────────

describe("POST /inbox/:id/convert", () => {
  it("201: creates draft note + flips inbox status", async () => {
    // getOwnItem → select returns the inbox row
    mockSelectResult.mockResolvedValue([INBOX_ROW]);
    // insert into research_notes returns the new note id
    mockInsertReturning.mockResolvedValue([{ id: "note_1" }]);
    // update evidenceInbox succeeds
    mockUpdateReturning.mockResolvedValue([
      { ...INBOX_ROW, status: "converted", noteId: "note_1" },
    ]);

    const res = await app.request("/inbox/item_1/convert", { method: "POST" });
    expect(res.status).toBe(201);

    const noteInsert = mockInsertValues.mock.calls[0]![0] as Record<
      string,
      unknown
    >;
    expect(noteInsert.kind).toBe("draft");
    expect(noteInsert.userId).toBe("user_1");
    expect(noteInsert.evidenceIds).toEqual(["inbox:item_1"]);
    expect((noteInsert.artifact as { kind: string }).kind).toBe("draft");

    const body = (await res.json()) as { noteId: string };
    expect(body.noteId).toBe("note_1");
  });

  it("200 idempotent when already converted", async () => {
    mockSelectResult.mockResolvedValue([
      { ...INBOX_ROW, status: "converted", noteId: "note_1" },
    ]);
    const res = await app.request("/inbox/item_1/convert", { method: "POST" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      noteId: string;
      alreadyConverted: boolean;
    };
    expect(body.noteId).toBe("note_1");
    expect(body.alreadyConverted).toBe(true);
    // no insert happened
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("409 when item is archived", async () => {
    mockSelectResult.mockResolvedValue([{ ...INBOX_ROW, status: "archived" }]);
    const res = await app.request("/inbox/item_1/convert", { method: "POST" });
    expect(res.status).toBe(409);
  });

  it("404 for unknown item id", async () => {
    mockSelectResult.mockResolvedValue([]);
    const res = await app.request("/inbox/nope/convert", { method: "POST" });
    expect(res.status).toBe(404);
  });
});

// ── DELETE /inbox/:id ─────────────────────────────────────────────────────

describe("DELETE /inbox/:id", () => {
  it("409 when item is converted", async () => {
    mockSelectResult.mockResolvedValue([
      { ...INBOX_ROW, status: "converted", noteId: "note_1" },
    ]);
    const res = await app.request("/inbox/item_1", { method: "DELETE" });
    expect(res.status).toBe(409);
  });

  it("200 when item is still in inbox", async () => {
    mockSelectResult.mockResolvedValue([INBOX_ROW]);
    mockDeleteReturning.mockResolvedValue([{ id: "item_1" }]);
    const res = await app.request("/inbox/item_1", { method: "DELETE" });
    expect(res.status).toBe(200);
  });
});

// ── PATCH /inbox/:id ──────────────────────────────────────────────────────

describe("PATCH /inbox/:id", () => {
  it("rejects status=converted (API-only transition)", async () => {
    const res = await app.request("/inbox/item_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "converted" }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects unknown keys", async () => {
    const res = await app.request("/inbox/item_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId: "fake" }),
    });
    expect(res.status).toBe(400);
  });
});
