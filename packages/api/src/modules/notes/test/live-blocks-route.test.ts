/**
 * /api/notes/:id/blocks — Live Block route tests (#167)
 *
 * Covers the issue's route checklist:
 *   1. Unauthenticated → 401 on both endpoints
 *   2. Unknown / cross-user note → 404 (no existence leak)
 *   3. Insert → 201, db.update rewrites ONLY live_blocks (+updatedAt)
 *   4. Refresh success → 200, block fresh, narrative untouched
 *   5. Refresh failure (network) → 200 with block-level failed, never 500
 *   6. Unknown block → 404
 *
 * DB and auth are mocked; builder/refresher logic has dedicated test files.
 */
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn<(...args: unknown[]) => Promise<unknown>>();

vi.mock("@workspace/auth/server", () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

// ── DB mock: select (note load) + update (live_blocks rewrite) ──────────────

const mockSelectLimit = vi.fn<() => Promise<unknown[]>>();
const mockUpdateReturning = vi.fn<() => Promise<unknown[]>>();
const mockUpdateSet = vi.fn<(values: unknown) => unknown>(() => ({
  where: () => ({ returning: mockUpdateReturning }),
}));

vi.mock("@workspace/db/server", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ limit: mockSelectLimit }),
      }),
    }),
    update: () => ({ set: mockUpdateSet }),
    insert: () => ({ values: () => ({ returning: () => [] }) }),
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

const EXISTING_BLOCK = {
  id: "lb_1",
  type: "evidence_ref",
  title: "FY2026 收入",
  source: "NVIDIA 10-K",
  sourceUrl: "https://example.com/10k",
  sourceType: "evidence",
  evidenceIds: ["E3"],
  content: { claim: "收入 $115B", date: "2026-01-31", confidence: "verified" },
  capturedAt: "2026-08-01T00:00:00.000Z",
  staleState: "stale",
};

const NOTE_ROW = {
  id: "note_1",
  userId: "user_1",
  liveBlocks: [EXISTING_BLOCK],
};

const insertBlock = (noteId: string, body: unknown) =>
  app.request(`/notes/${noteId}/blocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const refreshBlock = (noteId: string, blockId: string) =>
  app.request(`/notes/${noteId}/blocks/${blockId}/refresh`, {
    method: "POST",
  });

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("auth", () => {
  it("rejects unauthenticated insert with 401", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await insertBlock("note_1", {
      mode: "evidence_ref",
      evidenceRef: {
        id: "E1",
        claim: "c",
        source: "s",
        date: "2026-01-01",
        confidence: "partial",
      },
    });
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated refresh with 401", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await refreshBlock("note_1", "lb_1");
    expect(res.status).toBe(401);
  });
});

describe("POST /notes/:id/blocks", () => {
  it("returns 404 for unknown or cross-user notes", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    mockSelectLimit.mockResolvedValue([]); // user-scoped query found nothing
    const res = await insertBlock("note_1", {
      mode: "evidence_ref",
      evidenceRef: {
        id: "E1",
        claim: "c",
        source: "s",
        date: "2026-01-01",
        confidence: "partial",
      },
    });
    expect(res.status).toBe(404);
  });

  it("inserts a block and rewrites only live_blocks", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    mockSelectLimit.mockResolvedValue([{ ...NOTE_ROW, liveBlocks: [] }]);
    mockUpdateReturning.mockResolvedValue([NOTE_ROW]);

    const res = await insertBlock("note_1", {
      mode: "evidence_ref",
      evidenceRef: {
        id: "E3",
        claim: "收入 $115B",
        source: "NVIDIA 10-K",
        date: "2026-01-31",
        url: "https://example.com/10k",
        confidence: "verified",
      },
    });
    expect(res.status).toBe(201);
    const json = (await res.json()) as {
      block: { id: string; staleState: string; evidenceIds: string[] };
    };
    expect(json.block.staleState).toBe("fresh");
    expect(json.block.evidenceIds).toEqual(["E3"]);

    // The update payload must contain ONLY live_blocks + updatedAt —
    // never the immutable artifact / evidenceIds / asOf columns.
    const setArg = mockUpdateSet.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(setArg).sort()).toEqual(["liveBlocks", "updatedAt"]);
    expect(setArg.liveBlocks).toHaveLength(1);
  });

  it("rejects invalid input with 400", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    const res = await insertBlock("note_1", { mode: "nope" });
    expect(res.status).toBe(400);
  });
});

describe("POST /notes/:id/blocks/:blockId/refresh", () => {
  it("returns 404 for unknown or cross-user notes", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    mockSelectLimit.mockResolvedValue([]);
    const res = await refreshBlock("note_1", "lb_1");
    expect(res.status).toBe(404);
  });

  it("returns 404 for unknown blocks", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    mockSelectLimit.mockResolvedValue([NOTE_ROW]);
    const res = await refreshBlock("note_1", "lb_missing");
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("Live block not found.");
  });

  it("refreshes a reachable block to fresh without touching others", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    mockSelectLimit.mockResolvedValue([NOTE_ROW]);
    mockUpdateReturning.mockResolvedValue([NOTE_ROW]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: { cancel: () => Promise.resolve() },
      }),
    );

    const res = await refreshBlock("note_1", "lb_1");
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      block: {
        id: string;
        staleState: string;
        lastRefreshedAt?: string;
        content: { claim: string };
      };
    };
    expect(json.block.staleState).toBe("fresh");
    expect(json.block.lastRefreshedAt).toBeTruthy();
    // Captured content verbatim — refresh never rewrites it.
    expect(json.block.content.claim).toBe("收入 $115B");

    const setArg = mockUpdateSet.mock.calls[0]?.[0] as {
      liveBlocks: unknown[];
    };
    expect(setArg.liveBlocks).toHaveLength(1);
  });

  it("degrades network failure to block-level failed — never a 500", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    mockSelectLimit.mockResolvedValue([NOTE_ROW]);
    mockUpdateReturning.mockResolvedValue([NOTE_ROW]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED 10.0.0.1:5432")),
    );

    const res = await refreshBlock("note_1", "lb_1");
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      block: { staleState: string; refreshError?: string };
    };
    expect(json.block.staleState).toBe("failed");
    expect(json.block.refreshError).toContain("last saved content");
    // Neutral: no internal network detail leaks to the user.
    expect(json.block.refreshError).not.toContain("ECONNREFUSED");
    expect(json.block.refreshError).not.toContain("10.0.0.1");
  });

  it("marks url-less blocks manual_only instead of faking freshness", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    const noUrlRow = {
      ...NOTE_ROW,
      liveBlocks: [{ ...EXISTING_BLOCK, sourceUrl: undefined }],
    };
    mockSelectLimit.mockResolvedValue([noUrlRow]);
    mockUpdateReturning.mockResolvedValue([noUrlRow]);

    const res = await refreshBlock("note_1", "lb_1");
    expect(res.status).toBe(200);
    const json = (await res.json()) as { block: { staleState: string } };
    expect(json.block.staleState).toBe("manual_only");
  });
});
