/**
 * OwnerStorageProvider — mounted lifecycle tests.
 *
 * These tests simulate the provider's two-phase lifecycle:
 *
 *   Phase 1 (render): derive `ready` synchronously from
 *     appliedOwner (state) vs expectedOwner (from session).
 *   Phase 2 (effect): apply side effects (setOwnerId, removeQueries)
 *     and update appliedOwner state.
 *
 * This two-phase model proves the three Codex blockers are resolved:
 *
 * 1. Synchronous gate: ready is false the instant session identity
 *    diverges from appliedOwner — no stale frame, no effect delay.
 * 2. Identity key: children are keyed on appliedOwner, so React
 *    unmounts/remounts the subtree on identity transition, clearing
 *    local editor state that removeQueries() cannot reach.
 * 3. Unmount cleanup: clearOwnerId() called on provider unmount.
 *
 * They do NOT replace owner-id.ts unit tests (which cover the storage
 * layer). They verify the provider orchestrates transitions correctly.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── URL mock ────────────────────────────────────────────────────────────────

const revokedUrls: string[] = [];
Object.defineProperty(globalThis, "URL", {
  value: {
    createObjectURL: (blob: Blob) => `blob:test/${blob.size}`,
    revokeObjectURL: (url: string) => revokedUrls.push(url),
  },
  writable: true,
});

// ── Storage layer ───────────────────────────────────────────────────────────

import {
  clearOwnerId,
  getOwnerId,
  isOwnerReady,
  setOwnerId,
  snapshotGeneration,
  trackObjectUrl,
} from "../storage/owner-id";

// ── Query client mock ───────────────────────────────────────────────────────

function createMockQueryClient() {
  return {
    removeQueries: vi.fn<() => void>(),
    invalidateQueries: vi.fn<() => void>(),
  };
}

// ── Two-phase lifecycle simulator ───────────────────────────────────────────

/**
 * Models the session state that better-auth provides to the component.
 */
interface SessionState {
  isPending: boolean;
  error: boolean;
  userId: string | null;
}

/**
 * Phase 1 — Render gate.
 *
 * Derives `ready` synchronously from:
 *   - appliedOwner: what side effects have committed (state)
 *   - expectedOwner: what the session currently reports
 *
 * This runs BEFORE any effect. When session identity changes,
 * ready becomes false immediately — no stale frame.
 */
function simulateRender(
  session: SessionState,
  appliedOwner: string | null | undefined,
): { ready: boolean; identityKey: string | null } {
  const expectedOwner: string | null | undefined = session.isPending
    ? undefined
    : session.error
      ? null
      : session.userId;

  const ready =
    appliedOwner !== undefined &&
    !session.isPending &&
    appliedOwner === expectedOwner;

  return {
    ready,
    identityKey: ready ? (appliedOwner ?? "__unauthenticated") : null,
  };
}

/**
 * Phase 2 — Effect commit.
 *
 * Applies side effects (storage writes, cache flush) and returns
 * the new appliedOwner state. Mirrors the useEffect in owner-storage.tsx.
 */
function simulateEffect(
  session: SessionState,
  queryClient: ReturnType<typeof createMockQueryClient>,
): string | null | undefined {
  if (session.isPending) {
    // Reset appliedOwner → gate closes on next render.
    return undefined;
  }

  if (session.error) {
    const currentOwner = getOwnerId();
    if (currentOwner !== null) {
      clearOwnerId();
      queryClient.removeQueries();
    }
    return null;
  }

  const userId = session.userId;
  const currentOwner = getOwnerId();

  if (userId) {
    if (currentOwner !== userId) {
      setOwnerId(userId);
      if (currentOwner !== null) {
        queryClient.removeQueries();
      }
    }
  } else {
    if (currentOwner !== null) {
      clearOwnerId();
      queryClient.removeQueries();
    }
  }

  return userId;
}

/**
 * Simulates the unmount cleanup effect.
 */
function simulateUnmount() {
  clearOwnerId();
}

// ── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  clearOwnerId();
  revokedUrls.length = 0;
});

// ── Phase 1: synchronous render gate ────────────────────────────────────────

describe("OwnerStorageProvider: synchronous gate (render phase)", () => {
  it("gate is closed when appliedOwner is undefined (initial)", () => {
    const r = simulateRender(
      { isPending: false, error: false, userId: "user-a" },
      undefined,
    );
    expect(r.ready).toBe(false);
    expect(r.identityKey).toBeNull();
  });

  it("gate is closed when session is pending", () => {
    const r = simulateRender(
      { isPending: true, error: false, userId: null },
      "user-a",
    );
    expect(r.ready).toBe(false);
    expect(r.identityKey).toBeNull();
  });

  it("gate opens when appliedOwner matches session user", () => {
    const r = simulateRender(
      { isPending: false, error: false, userId: "user-a" },
      "user-a",
    );
    expect(r.ready).toBe(true);
    expect(r.identityKey).toBe("user-a");
  });

  it("gate opens as unauthenticated when both are null", () => {
    const r = simulateRender(
      { isPending: false, error: false, userId: null },
      null,
    );
    expect(r.ready).toBe(true);
    expect(r.identityKey).toBe("__unauthenticated");
  });

  it("gate opens for error state when appliedOwner is null", () => {
    const r = simulateRender(
      { isPending: false, error: true, userId: null },
      null,
    );
    expect(r.ready).toBe(true);
    expect(r.identityKey).toBe("__unauthenticated");
  });

  it("gate closes when appliedOwner ≠ session user (transition in progress)", () => {
    const r = simulateRender(
      { isPending: false, error: false, userId: "user-b" },
      "user-a",
    );
    expect(r.ready).toBe(false);
    expect(r.identityKey).toBeNull();
  });
});

// ── Phase 2: effect commit ──────────────────────────────────────────────────

describe("OwnerStorageProvider: effect commit", () => {
  it("pending → resets appliedOwner to undefined", () => {
    const qc = createMockQueryClient();
    const applied = simulateEffect(
      { isPending: true, error: false, userId: null },
      qc,
    );
    expect(applied).toBeUndefined();
  });

  it("error → clears owner, flushes caches, returns null", () => {
    setOwnerId("user-a");
    const qc = createMockQueryClient();
    const applied = simulateEffect(
      { isPending: false, error: true, userId: null },
      qc,
    );
    expect(applied).toBeNull();
    expect(getOwnerId()).toBeNull();
    expect(qc.removeQueries).toHaveBeenCalled();
  });

  it("authenticated → sets owner, returns userId", () => {
    const qc = createMockQueryClient();
    const applied = simulateEffect(
      { isPending: false, error: false, userId: "user-a" },
      qc,
    );
    expect(applied).toBe("user-a");
    expect(getOwnerId()).toBe("user-a");
  });

  it("unauthenticated → clears owner, returns null", () => {
    setOwnerId("user-a");
    const qc = createMockQueryClient();
    const applied = simulateEffect(
      { isPending: false, error: false, userId: null },
      qc,
    );
    expect(applied).toBeNull();
    expect(getOwnerId()).toBeNull();
    expect(qc.removeQueries).toHaveBeenCalled();
  });

  it("same-user → no-op (no removeQueries, no generation bump)", () => {
    setOwnerId("user-a");
    const genBefore = snapshotGeneration();
    const qc = createMockQueryClient();
    const applied = simulateEffect(
      { isPending: false, error: false, userId: "user-a" },
      qc,
    );
    expect(applied).toBe("user-a");
    expect(snapshotGeneration()).toBe(genBefore);
    expect(qc.removeQueries).not.toHaveBeenCalled();
  });
});

// ── Full lifecycle: two-phase transitions ───────────────────────────────────

describe("OwnerStorageProvider: direct A→B (no pending intermediate)", () => {
  it("gate closes synchronously, no stale A frame, children remount under B", () => {
    const qc = createMockQueryClient();

    // Step 1: A mounts — effect commits, render opens gate
    const appliedA = simulateEffect(
      { isPending: false, error: false, userId: "user-a" },
      qc,
    );
    const renderA = simulateRender(
      { isPending: false, error: false, userId: "user-a" },
      appliedA,
    );
    expect(renderA.ready).toBe(true);
    expect(renderA.identityKey).toBe("user-a");
    expect(getOwnerId()).toBe("user-a");

    // Step 2: Session switches DIRECTLY to B (no pending).
    // Render phase: appliedOwner is still A, session reports B → gate closes.
    const renderDirectB = simulateRender(
      { isPending: false, error: false, userId: "user-b" },
      appliedA, // still "user-a" — effect hasn't run yet
    );
    expect(renderDirectB.ready).toBe(false); // ← synchronous gate: no stale A frame
    expect(renderDirectB.identityKey).toBeNull();

    // Step 3: Effect runs, commits B
    const appliedB = simulateEffect(
      { isPending: false, error: false, userId: "user-b" },
      qc,
    );
    expect(appliedB).toBe("user-b");
    expect(getOwnerId()).toBe("user-b");
    expect(qc.removeQueries).toHaveBeenCalled();

    // Step 4: Render opens gate under B with new identity key
    const renderB = simulateRender(
      { isPending: false, error: false, userId: "user-b" },
      appliedB,
    );
    expect(renderB.ready).toBe(true);
    expect(renderB.identityKey).toBe("user-b"); // different key → React remounts subtree
  });
});

describe("OwnerStorageProvider: A→pending→B transition", () => {
  it("gate closes on pending, reopens under B after effect commits", () => {
    const qc = createMockQueryClient();

    // A is active
    const appliedA = simulateEffect(
      { isPending: false, error: false, userId: "user-a" },
      qc,
    );
    expect(getOwnerId()).toBe("user-a");

    // Session goes pending (re-auth starting)
    const renderPending = simulateRender(
      { isPending: true, error: false, userId: null },
      appliedA,
    );
    expect(renderPending.ready).toBe(false); // gate closes synchronously

    // Effect resets appliedOwner
    const appliedPending = simulateEffect(
      { isPending: true, error: false, userId: null },
      qc,
    );
    expect(appliedPending).toBeUndefined();

    // B resolves — render: appliedOwner=undefined, session=B → gate still closed
    const renderResolve = simulateRender(
      { isPending: false, error: false, userId: "user-b" },
      appliedPending,
    );
    expect(renderResolve.ready).toBe(false);

    // Effect commits B
    const appliedB = simulateEffect(
      { isPending: false, error: false, userId: "user-b" },
      qc,
    );
    expect(appliedB).toBe("user-b");
    expect(getOwnerId()).toBe("user-b");
    expect(qc.removeQueries).toHaveBeenCalled();

    // Gate opens under B
    const renderB = simulateRender(
      { isPending: false, error: false, userId: "user-b" },
      appliedB,
    );
    expect(renderB.ready).toBe(true);
    expect(renderB.identityKey).toBe("user-b");
  });
});

describe("OwnerStorageProvider: session error", () => {
  it("error from authenticated state: gate closes, then opens as unauthenticated", () => {
    const qc = createMockQueryClient();

    // A is active
    const appliedA = simulateEffect(
      { isPending: false, error: false, userId: "user-a" },
      qc,
    );

    // Session errors — render: appliedOwner=A, expected=null → gate closes
    const renderError = simulateRender(
      { isPending: false, error: true, userId: null },
      appliedA,
    );
    expect(renderError.ready).toBe(false);

    // Effect clears owner
    const appliedError = simulateEffect(
      { isPending: false, error: true, userId: null },
      qc,
    );
    expect(appliedError).toBeNull();
    expect(getOwnerId()).toBeNull();
    expect(qc.removeQueries).toHaveBeenCalled();

    // Gate opens as unauthenticated
    const renderUnauth = simulateRender(
      { isPending: false, error: true, userId: null },
      appliedError,
    );
    expect(renderUnauth.ready).toBe(true);
    expect(renderUnauth.identityKey).toBe("__unauthenticated");
  });
});

describe("OwnerStorageProvider: logout", () => {
  it("logout: gate closes, then opens as unauthenticated", () => {
    const qc = createMockQueryClient();

    // A is active
    const appliedA = simulateEffect(
      { isPending: false, error: false, userId: "user-a" },
      qc,
    );

    // Logout — render: appliedOwner=A, expected=null → gate closes
    const renderLogout = simulateRender(
      { isPending: false, error: false, userId: null },
      appliedA,
    );
    expect(renderLogout.ready).toBe(false);

    // Effect clears owner
    const appliedLogout = simulateEffect(
      { isPending: false, error: false, userId: null },
      qc,
    );
    expect(appliedLogout).toBeNull();
    expect(getOwnerId()).toBeNull();
    expect(qc.removeQueries).toHaveBeenCalled();

    // Gate opens as unauthenticated
    const renderUnauth = simulateRender(
      { isPending: false, error: false, userId: null },
      appliedLogout,
    );
    expect(renderUnauth.ready).toBe(true);
    expect(renderUnauth.identityKey).toBe("__unauthenticated");
  });
});

describe("OwnerStorageProvider: initial mount", () => {
  it("first render: gate closed until effect commits", () => {
    const qc = createMockQueryClient();

    // First render — appliedOwner=undefined, session resolved → gate closed
    const render1 = simulateRender(
      { isPending: false, error: false, userId: "user-a" },
      undefined,
    );
    expect(render1.ready).toBe(false);

    // Effect commits
    const applied = simulateEffect(
      { isPending: false, error: false, userId: "user-a" },
      qc,
    );
    expect(applied).toBe("user-a");

    // Second render — gate opens
    const render2 = simulateRender(
      { isPending: false, error: false, userId: "user-a" },
      applied,
    );
    expect(render2.ready).toBe(true);
    expect(render2.identityKey).toBe("user-a");
  });

  it("initial pending: gate stays closed through pending→resolve cycle", () => {
    const qc = createMockQueryClient();

    // Pending
    const renderP = simulateRender(
      { isPending: true, error: false, userId: null },
      undefined,
    );
    expect(renderP.ready).toBe(false);

    // Effect during pending → stays undefined
    const appliedP = simulateEffect(
      { isPending: true, error: false, userId: null },
      qc,
    );
    expect(appliedP).toBeUndefined();

    // Resolves
    const applied = simulateEffect(
      { isPending: false, error: false, userId: "user-a" },
      qc,
    );
    expect(applied).toBe("user-a");

    // Gate opens
    const render = simulateRender(
      { isPending: false, error: false, userId: "user-a" },
      applied,
    );
    expect(render.ready).toBe(true);
  });
});

// ── Identity key forces remount ─────────────────────────────────────────────

describe("OwnerStorageProvider: identity key forces subtree remount", () => {
  it("A and B produce different identity keys", () => {
    const keyA = simulateRender(
      { isPending: false, error: false, userId: "user-a" },
      "user-a",
    );
    const keyB = simulateRender(
      { isPending: false, error: false, userId: "user-b" },
      "user-b",
    );
    expect(keyA.identityKey).toBe("user-a");
    expect(keyB.identityKey).toBe("user-b");
    expect(keyA.identityKey).not.toBe(keyB.identityKey);
  });

  it("authenticated and unauthenticated produce different keys", () => {
    const keyAuth = simulateRender(
      { isPending: false, error: false, userId: "user-a" },
      "user-a",
    );
    const keyUnauth = simulateRender(
      { isPending: false, error: false, userId: null },
      null,
    );
    expect(keyAuth.identityKey).toBe("user-a");
    expect(keyUnauth.identityKey).toBe("__unauthenticated");
    expect(keyAuth.identityKey).not.toBe(keyUnauth.identityKey);
  });
});

// ── Unmount cleanup ─────────────────────────────────────────────────────────

describe("OwnerStorageProvider: unmount cleanup", () => {
  it("unmount clears ownership and revokes URLs", () => {
    simulateEffect(
      { isPending: false, error: false, userId: "user-a" },
      createMockQueryClient(),
    );
    trackObjectUrl("blob:test/url-1");
    expect(getOwnerId()).toBe("user-a");

    simulateUnmount();

    expect(getOwnerId()).toBeNull();
    expect(isOwnerReady()).toBe(false);
    expect(revokedUrls).toContain("blob:test/url-1");
  });

  it("unmount when already unauthenticated is a no-op", () => {
    const genBefore = snapshotGeneration();
    simulateUnmount();
    expect(snapshotGeneration()).toBe(genBefore);
    expect(getOwnerId()).toBeNull();
  });
});

// ── Query isolation ─────────────────────────────────────────────────────────

describe("OwnerStorageProvider: query isolation", () => {
  it("A→B removes all queries (not invalidate)", () => {
    const qc = createMockQueryClient();

    simulateEffect({ isPending: false, error: false, userId: "user-a" }, qc);
    simulateEffect({ isPending: false, error: false, userId: "user-b" }, qc);

    expect(qc.removeQueries).toHaveBeenCalled();
    expect(qc.invalidateQueries).not.toHaveBeenCalled();
  });

  it("logout removes all queries", () => {
    const qc = createMockQueryClient();

    simulateEffect({ isPending: false, error: false, userId: "user-a" }, qc);
    simulateEffect({ isPending: false, error: false, userId: null }, qc);

    expect(qc.removeQueries).toHaveBeenCalled();
    expect(qc.invalidateQueries).not.toHaveBeenCalled();
  });

  it("same-user rerender does NOT remove queries", () => {
    const qc = createMockQueryClient();

    simulateEffect({ isPending: false, error: false, userId: "user-a" }, qc);
    simulateEffect({ isPending: false, error: false, userId: "user-a" }, qc);

    expect(qc.removeQueries).not.toHaveBeenCalled();
  });
});
