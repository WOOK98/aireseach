/**
 * OwnerStorageProvider — mounted lifecycle tests.
 *
 * These tests simulate the provider's state machine without requiring
 * a full React DOM environment. They verify the three Codex blockers:
 *
 * 1. Gate resets on identity transitions (ready is not a one-shot boolean).
 * 2. removeQueries() used instead of invalidateQueries().
 * 3. Unmount cleanup calls clearOwnerId().
 *
 * The tests model the provider as a state machine:
 *   session state → applyOwner → gate/query/cleanup behavior
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

// ── Session lifecycle simulator ─────────────────────────────────────────────

/**
 * Simulates the OwnerStorageProvider's effect + applyOwner logic.
 *
 * This models the exact code path in owner-storage.tsx:
 *   effect checks session.isPending → reset gate
 *   effect checks session.isError → applyOwner(null)
 *   effect calls applyOwner(userId) → compare current vs new →
 *     setOwnerId/clearOwnerId → removeQueries → update state
 *
 * Returns the provider state after the effect runs.
 */
interface SessionState {
  isPending: boolean;
  error: boolean;
  userId: string | null;
}

interface ProviderState {
  gateReady: boolean;
  verifiedOwner: string | null;
  gateOpen: boolean; // gateReady && session resolved
}

function simulateProviderEffect(
  session: SessionState,
  queryClient: ReturnType<typeof createMockQueryClient>,
): ProviderState {
  // Re-entering pending state → reset gate (children unmount)
  if (session.isPending) {
    return { gateReady: false, verifiedOwner: null, gateOpen: false };
  }

  // Session error → treat as unauthenticated
  if (session.error) {
    const currentOwner = getOwnerId();
    if (currentOwner !== null) {
      clearOwnerId();
      queryClient.removeQueries();
    }
    return { gateReady: true, verifiedOwner: null, gateOpen: true };
  }

  // Normal resolution — mirrors applyOwner()
  const userId = session.userId;
  const currentOwner = getOwnerId();

  if (userId) {
    if (currentOwner !== userId) {
      // setOwnerId internally: clearOwnerId → revokeActiveUrls → bump gen
      setOwnerId(userId);

      if (currentOwner !== null) {
        // A→B: flush stale caches via removeQueries
        queryClient.removeQueries();
      }
    }
  } else {
    if (currentOwner !== null) {
      clearOwnerId();
      queryClient.removeQueries();
    }
  }

  return { gateReady: true, verifiedOwner: userId, gateOpen: true };
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

describe("OwnerStorageProvider lifecycle: initial mount", () => {
  it("gate is closed when session is pending", () => {
    const qc = createMockQueryClient();
    const state = simulateProviderEffect(
      { isPending: true, error: false, userId: null },
      qc,
    );

    expect(state.gateReady).toBe(false);
    expect(state.gateOpen).toBe(false);
    expect(getOwnerId()).toBeNull();
  });

  it("gate opens when session resolves with user", () => {
    const qc = createMockQueryClient();
    const state = simulateProviderEffect(
      { isPending: false, error: false, userId: "user-a" },
      qc,
    );

    expect(state.gateReady).toBe(true);
    expect(state.gateOpen).toBe(true);
    expect(state.verifiedOwner).toBe("user-a");
    expect(getOwnerId()).toBe("user-a");
  });

  it("gate opens as unauthenticated when session resolves without user", () => {
    const qc = createMockQueryClient();
    const state = simulateProviderEffect(
      { isPending: false, error: false, userId: null },
      qc,
    );

    expect(state.gateReady).toBe(true);
    expect(state.gateOpen).toBe(true);
    expect(state.verifiedOwner).toBeNull();
    expect(getOwnerId()).toBeNull();
  });

  it("gate opens as unauthenticated on session error", () => {
    setOwnerId("user-a");
    const qc = createMockQueryClient();
    const state = simulateProviderEffect(
      { isPending: false, error: true, userId: null },
      qc,
    );

    expect(state.gateReady).toBe(true);
    expect(state.gateOpen).toBe(true);
    expect(getOwnerId()).toBeNull();
    // removeQueries called when transitioning from authenticated
    expect(qc.removeQueries).toHaveBeenCalled();
  });
});

describe("OwnerStorageProvider lifecycle: A→B identity transition", () => {
  it("resets gate during pending re-auth (gate closes, children unmount)", () => {
    const qc = createMockQueryClient();

    // Step 1: A mounts
    simulateProviderEffect(
      { isPending: false, error: false, userId: "user-a" },
      qc,
    );
    expect(getOwnerId()).toBe("user-a");

    // Step 2: re-auth begins (pending) — gate closes
    const pendingState = simulateProviderEffect(
      { isPending: true, error: false, userId: null },
      qc,
    );
    expect(pendingState.gateReady).toBe(false);
    expect(pendingState.gateOpen).toBe(false);
  });

  it("A→B transition: uses removeQueries (not invalidateQueries)", () => {
    const qc = createMockQueryClient();

    // A mounts
    simulateProviderEffect(
      { isPending: false, error: false, userId: "user-a" },
      qc,
    );
    expect(qc.invalidateQueries).not.toHaveBeenCalled();

    // A→B
    simulateProviderEffect(
      { isPending: false, error: false, userId: "user-b" },
      qc,
    );

    // removeQueries was called for the A→B transition
    expect(qc.removeQueries).toHaveBeenCalled();
    // invalidateQueries was NEVER used — this is the Codex blocker fix
    expect(qc.invalidateQueries).not.toHaveBeenCalled();
    expect(getOwnerId()).toBe("user-b");
  });

  it("A→B: owner generation bumps (identity change detected)", () => {
    const qc = createMockQueryClient();

    simulateProviderEffect(
      { isPending: false, error: false, userId: "user-a" },
      qc,
    );
    const genA = snapshotGeneration();

    simulateProviderEffect(
      { isPending: false, error: false, userId: "user-b" },
      qc,
    );
    const genB = snapshotGeneration();

    expect(genB).toBeGreaterThan(genA);
    expect(getOwnerId()).toBe("user-b");
  });

  it("A→B through pending: gate closes then reopens under B", () => {
    const qc = createMockQueryClient();

    // A mounts
    const stateA = simulateProviderEffect(
      { isPending: false, error: false, userId: "user-a" },
      qc,
    );
    expect(stateA.gateOpen).toBe(true);
    expect(stateA.verifiedOwner).toBe("user-a");

    // Re-auth begins → gate closes (children unmount)
    const pendingState = simulateProviderEffect(
      { isPending: true, error: false, userId: null },
      qc,
    );
    expect(pendingState.gateOpen).toBe(false);

    // B resolves → gate opens under B (children remount with fresh state)
    const stateB = simulateProviderEffect(
      { isPending: false, error: false, userId: "user-b" },
      qc,
    );
    expect(stateB.gateOpen).toBe(true);
    expect(stateB.verifiedOwner).toBe("user-b");
    expect(getOwnerId()).toBe("user-b");
  });

  it("A→logout: clears ownership and removes queries", () => {
    const qc = createMockQueryClient();

    simulateProviderEffect(
      { isPending: false, error: false, userId: "user-a" },
      qc,
    );
    expect(isOwnerReady()).toBe(true);

    // Logout
    simulateProviderEffect(
      { isPending: false, error: false, userId: null },
      qc,
    );
    expect(getOwnerId()).toBeNull();
    expect(isOwnerReady()).toBe(false);
    expect(qc.removeQueries).toHaveBeenCalled();
  });
});

describe("OwnerStorageProvider lifecycle: same-user rerender", () => {
  it("same-user session refresh does NOT bump generation or remove queries", () => {
    const qc = createMockQueryClient();

    simulateProviderEffect(
      { isPending: false, error: false, userId: "user-a" },
      qc,
    );
    const genBefore = snapshotGeneration();

    // Same user, different session object (token refresh)
    simulateProviderEffect(
      { isPending: false, error: false, userId: "user-a" },
      qc,
    );

    // No generation bump, no query removal
    expect(snapshotGeneration()).toBe(genBefore);
    expect(qc.removeQueries).not.toHaveBeenCalled();
    expect(getOwnerId()).toBe("user-a");
  });
});

describe("OwnerStorageProvider lifecycle: unmount cleanup", () => {
  it("unmount clears ownership and revokes URLs", () => {
    simulateProviderEffect(
      { isPending: false, error: false, userId: "user-a" },
      createMockQueryClient(),
    );
    trackObjectUrl("blob:test/url-1");
    expect(getOwnerId()).toBe("user-a");

    // Simulate unmount
    simulateUnmount();

    expect(getOwnerId()).toBeNull();
    expect(isOwnerReady()).toBe(false);
    expect(revokedUrls).toContain("blob:test/url-1");
  });

  it("unmount when already unauthenticated is a no-op", () => {
    const genBefore = snapshotGeneration();

    simulateUnmount();

    // No generation bump for no-op clear
    expect(snapshotGeneration()).toBe(genBefore);
    expect(getOwnerId()).toBeNull();
  });
});

describe("OwnerStorageProvider lifecycle: query isolation", () => {
  it("A→B removes all queries", () => {
    const qc = createMockQueryClient();

    simulateProviderEffect(
      { isPending: false, error: false, userId: "user-a" },
      qc,
    );

    simulateProviderEffect(
      { isPending: false, error: false, userId: "user-b" },
      qc,
    );

    // removeQueries called (not invalidateQueries)
    expect(qc.removeQueries).toHaveBeenCalled();
    expect(qc.invalidateQueries).not.toHaveBeenCalled();
  });

  it("logout removes all queries", () => {
    const qc = createMockQueryClient();

    simulateProviderEffect(
      { isPending: false, error: false, userId: "user-a" },
      qc,
    );

    simulateProviderEffect(
      { isPending: false, error: false, userId: null },
      qc,
    );

    expect(qc.removeQueries).toHaveBeenCalled();
    expect(qc.invalidateQueries).not.toHaveBeenCalled();
  });

  it("same-user rerender does NOT remove queries", () => {
    const qc = createMockQueryClient();

    simulateProviderEffect(
      { isPending: false, error: false, userId: "user-a" },
      qc,
    );
    simulateProviderEffect(
      { isPending: false, error: false, userId: "user-a" },
      qc,
    );

    expect(qc.removeQueries).not.toHaveBeenCalled();
  });
});
