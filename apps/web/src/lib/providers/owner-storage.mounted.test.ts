import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { act, useLayoutEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
// @vitest-environment jsdom
/**
 * OwnerStorageProvider — mounted lifecycle tests.
 *
 * These tests mount the REAL OwnerStorageProvider with:
 * - A mocked auth session (controllable via sessionState)
 * - A real QueryClient seeded with user-A data
 * - A stateful child with an independent draft seeded on first mount
 *
 * Design principles:
 * - StatefulChild does NOT reset its draft on identity changes.
 *   Its draft is seeded once on mount and persists across re-renders.
 *   This means if the provider fails to remount the child on A→B,
 *   the A draft leaks into B's view.
 * - Committed-frame observations are recorded via useLayoutEffect
 *   refs, capturing every frame React actually paints.
 * - QueryClient is seeded with real A-owned queries; assertions verify
 *   they are removed (not just invalidated) on transition.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearOwnerId,
  getOwnerId,
  isOwnerReady,
  snapshotGeneration,
} from "../storage/owner-id";

// ── Mock auth client ────────────────────────────────────────────────────────

let sessionState: {
  isPending: boolean;
  error: Error | null;
  data: { user?: { id?: string } } | null;
} = { isPending: true, error: null, data: null };

vi.mock("~/lib/auth/client", () => ({
  authClient: {
    useSession: () => sessionState,
  },
}));

// Import AFTER mock.
const { OwnerStorageProvider } = await import("./owner-storage");

// ── Helpers ─────────────────────────────────────────────────────────────────

let root: Root;
let container: HTMLDivElement;
let childMountCount = 0;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

/**
 * Seed real A-owned query data into the QueryClient.
 * Returns the query key so tests can verify removal.
 */
function seedQueryData(qc: QueryClient, userId: string) {
  const key = ["user-data", userId];
  qc.setQueryData(key, { userId, notes: [`note-by-${userId}`] });
  return key;
}

/**
 * Check if a query key still has data in the cache.
 */
function hasQueryData(qc: QueryClient, key: unknown[]): boolean {
  return qc.getQueryData(key) !== undefined;
}

/**
 * Committed-frame recorder.
 * useLayoutEffect runs synchronously before the browser paints,
 * so this captures every frame React actually commits to the DOM.
 */
type FrameObservation = {
  text: string;
  hasChild: boolean;
  ownerId: string | null;
  timestamp: number;
};

const committedFrames: FrameObservation[] = [];

function recordFrame(container: HTMLDivElement) {
  committedFrames.push({
    text: container?.textContent ?? "",
    hasChild: container?.querySelector("[data-testid='child']") !== null,
    ownerId: getOwnerId(),
    timestamp: Date.now(),
  });
}

/**
 * Stateful child that retains its initial draft across re-renders.
 *
 * The draft is seeded ONCE from the owner identity at mount time.
 * If the provider fails to remount this child on identity change,
 * the old draft survives into the new owner's view — which is the
 * exact regression we're testing for.
 *
 * The child records committed frames via a layout effect ref.
 */
function StatefulChild({ owner }: { owner: string }) {
  // Seed draft once on mount. NO useEffect that resets it.
  const [draft] = useState(() => `${owner}-secret-draft`);
  // Track mount identity to detect remounts.
  const mountId = useRef(++childMountCount);

  // Record every committed frame.
  useLayoutEffect(() => {
    recordFrame(container);
  });

  return React.createElement(
    "span",
    { "data-testid": "child", "data-mount-id": String(mountId.current) },
    `owner:${owner} draft:${draft} mount:${mountId.current}`,
  );
}

function getRenderedText(): string {
  return container?.textContent ?? "";
}

function childIsRendered(): boolean {
  return container?.querySelector("[data-testid='child']") !== null;
}

function mountProvider(qc: QueryClient, userId: string) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  committedFrames.length = 0;
  act(() => {
    root.render(
      React.createElement(
        QueryClientProvider,
        { client: qc },
        React.createElement(
          OwnerStorageProvider,
          null,
          React.createElement(StatefulChild, { owner: userId }),
        ),
      ),
    );
  });
}

function rerenderProvider(qc: QueryClient, userId: string) {
  act(() => {
    root.render(
      React.createElement(
        QueryClientProvider,
        { client: qc },
        React.createElement(
          OwnerStorageProvider,
          null,
          React.createElement(StatefulChild, { owner: userId }),
        ),
      ),
    );
  });
}

function unmountProvider() {
  act(() => {
    root.unmount();
  });
  container?.remove();
}

// ── Lifecycle ───────────────────────────────────────────────────────────────

beforeEach(() => {
  clearOwnerId();
  sessionState = { isPending: true, error: null, data: null };
  committedFrames.length = 0;
  childMountCount = 0;
});

afterEach(() => {
  try {
    root?.unmount();
  } catch {
    /* ignore */
  }
  container?.remove();
  clearOwnerId();
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("OwnerStorageProvider (mounted): initial mount", () => {
  it("gate closed during pending — child not rendered", () => {
    const qc = createQueryClient();
    sessionState = { isPending: true, error: null, data: null };
    mountProvider(qc, "user-a");

    expect(childIsRendered()).toBe(false);
    expect(getOwnerId()).toBeNull();
  });

  it("gate opens after session resolves — child renders under A", () => {
    const qc = createQueryClient();
    sessionState = { isPending: true, error: null, data: null };
    mountProvider(qc, "user-a");
    expect(childIsRendered()).toBe(false);

    act(() => {
      sessionState = {
        isPending: false,
        error: null,
        data: { user: { id: "user-a" } },
      };
      rerenderProvider(qc, "user-a");
    });

    expect(childIsRendered()).toBe(true);
    expect(getRenderedText()).toContain("owner:user-a");
    expect(getRenderedText()).toContain("user-a-secret-draft");
    expect(getOwnerId()).toBe("user-a");
  });
});

describe("OwnerStorageProvider (mounted): direct A→B (no pending)", () => {
  it("no committed frame contains A draft after A→B switch", () => {
    const qc = createQueryClient();
    const aKey = seedQueryData(qc, "user-a");

    // Mount under A
    sessionState = {
      isPending: false,
      error: null,
      data: { user: { id: "user-a" } },
    };
    mountProvider(qc, "user-a");
    expect(childIsRendered()).toBe(true);
    expect(getRenderedText()).toContain("user-a-secret-draft");
    expect(getOwnerId()).toBe("user-a");
    expect(hasQueryData(qc, aKey)).toBe(true);

    // Switch directly to B (no pending intermediate).
    committedFrames.length = 0; // Reset to observe only transition frames
    act(() => {
      sessionState = {
        isPending: false,
        error: null,
        data: { user: { id: "user-b" } },
      };
      rerenderProvider(qc, "user-b");
    });

    // CRITICAL: no committed frame may contain A's draft
    for (const frame of committedFrames) {
      expect(frame.text).not.toContain("user-a-secret-draft");
    }

    // Final state: B owns the child, no A draft, A queries removed
    expect(getOwnerId()).toBe("user-b");
    expect(getRenderedText()).toContain("owner:user-b");
    expect(getRenderedText()).not.toContain("user-a-secret-draft");
    expect(hasQueryData(qc, aKey)).toBe(false);

    const genBefore = snapshotGeneration();
    expect(snapshotGeneration()).toBeGreaterThanOrEqual(genBefore);
  });
});

describe("OwnerStorageProvider (mounted): A→pending→B", () => {
  it("gate closes on pending, no A draft in any B frame", () => {
    const qc = createQueryClient();
    seedQueryData(qc, "user-a");

    sessionState = {
      isPending: false,
      error: null,
      data: { user: { id: "user-a" } },
    };
    mountProvider(qc, "user-a");
    expect(getOwnerId()).toBe("user-a");

    // Pending
    committedFrames.length = 0;
    act(() => {
      sessionState = { isPending: true, error: null, data: null };
      rerenderProvider(qc, "user-b");
    });

    // Gate closed — child not rendered during pending
    expect(childIsRendered()).toBe(false);

    // Resolve to B
    act(() => {
      sessionState = {
        isPending: false,
        error: null,
        data: { user: { id: "user-b" } },
      };
      rerenderProvider(qc, "user-b");
    });

    // No committed frame with A draft
    for (const frame of committedFrames) {
      expect(frame.text).not.toContain("user-a-secret-draft");
    }

    expect(getOwnerId()).toBe("user-b");
    expect(getRenderedText()).toContain("owner:user-b");
  });
});

describe("OwnerStorageProvider (mounted): session error", () => {
  it("error from A: child remounts under unauthenticated identity", () => {
    const qc = createQueryClient();
    seedQueryData(qc, "user-a");

    sessionState = {
      isPending: false,
      error: null,
      data: { user: { id: "user-a" } },
    };
    mountProvider(qc, "user-a");
    expect(childIsRendered()).toBe(true);
    const firstMountId = container
      .querySelector("[data-testid='child']")
      ?.getAttribute("data-mount-id");

    act(() => {
      sessionState = {
        isPending: false,
        error: new Error("session expired"),
        data: null,
      };
      rerenderProvider(qc, "user-a");
    });

    // Owner cleared, child remounted under new identity key
    expect(getOwnerId()).toBeNull();
    // The child should have been remounted (new mountId)
    const secondMountId = container
      .querySelector("[data-testid='child']")
      ?.getAttribute("data-mount-id");
    expect(secondMountId).not.toBe(firstMountId);
  });
});

describe("OwnerStorageProvider (mounted): logout", () => {
  it("logout: child remounts under unauthenticated identity", () => {
    const qc = createQueryClient();
    seedQueryData(qc, "user-a");

    sessionState = {
      isPending: false,
      error: null,
      data: { user: { id: "user-a" } },
    };
    mountProvider(qc, "user-a");
    expect(childIsRendered()).toBe(true);
    const firstMountId = container
      .querySelector("[data-testid='child']")
      ?.getAttribute("data-mount-id");

    act(() => {
      sessionState = { isPending: false, error: null, data: null };
      rerenderProvider(qc, "user-a");
    });

    // Owner cleared, child remounted under new identity key
    expect(getOwnerId()).toBeNull();
    const secondMountId = container
      .querySelector("[data-testid='child']")
      ?.getAttribute("data-mount-id");
    expect(secondMountId).not.toBe(firstMountId);
  });
});

describe("OwnerStorageProvider (mounted): unmount cleanup", () => {
  it("provider unmount clears ownership", () => {
    const qc = createQueryClient();

    sessionState = {
      isPending: false,
      error: null,
      data: { user: { id: "user-a" } },
    };
    mountProvider(qc, "user-a");
    expect(getOwnerId()).toBe("user-a");

    unmountProvider();

    expect(getOwnerId()).toBeNull();
    expect(isOwnerReady()).toBe(false);
  });
});

describe("OwnerStorageProvider (mounted): query isolation", () => {
  it("A→B removes stale caches with real QueryClient data", () => {
    const qc = createQueryClient();
    const aKey = seedQueryData(qc, "user-a");
    const removeSpy = vi.spyOn(qc, "removeQueries");

    sessionState = {
      isPending: false,
      error: null,
      data: { user: { id: "user-a" } },
    };
    mountProvider(qc, "user-a");

    // Verify A data is in cache before transition
    expect(hasQueryData(qc, aKey)).toBe(true);

    act(() => {
      sessionState = {
        isPending: false,
        error: null,
        data: { user: { id: "user-b" } },
      };
      rerenderProvider(qc, "user-b");
    });

    // removeQueries was called, not invalidateQueries
    expect(removeSpy).toHaveBeenCalled();
    // A data is gone from cache
    expect(hasQueryData(qc, aKey)).toBe(false);
  });

  it("same-user rerender does NOT remove queries", () => {
    const qc = createQueryClient();
    const removeSpy = vi.spyOn(qc, "removeQueries");

    sessionState = {
      isPending: false,
      error: null,
      data: { user: { id: "user-a" } },
    };
    mountProvider(qc, "user-a");

    const removeCallCount = removeSpy.mock.calls.length;
    act(() => {
      rerenderProvider(qc, "user-a");
    });
    expect(removeSpy.mock.calls.length).toBe(removeCallCount);
  });
});

describe("OwnerStorageProvider (mounted): regression — pre-fix behavior", () => {
  it("fixed provider does NOT leak A draft into B frame (see negative-control in prefix-regression.test.ts)", () => {
    /**
     * This test verifies the FIX: after A→B, no committed frame contains
     * A's draft. The matching NEGATIVE CONTROL (proving the pre-fix
     * provider DOES leak) lives in owner-storage.prefix-regression.test.ts.
     *
     * The pre-fix provider had: ready = appliedOwner !== undefined
     * When session changed A→B, appliedOwner was still "user-a" →
     * ready=true → child rendered one more frame under A's identity.
     *
     * The fix gates on: appliedOwner === expectedOwner
     * So when session changes to B, ready=false immediately.
     */
    const qc = createQueryClient();

    sessionState = {
      isPending: false,
      error: null,
      data: { user: { id: "user-a" } },
    };
    mountProvider(qc, "user-a");
    expect(getRenderedText()).toContain("user-a-secret-draft");

    committedFrames.length = 0;
    act(() => {
      sessionState = {
        isPending: false,
        error: null,
        data: { user: { id: "user-b" } },
      };
      rerenderProvider(qc, "user-b");
    });

    // Every committed frame after transition must be clean
    for (const frame of committedFrames) {
      expect(frame.text).not.toContain("user-a-secret-draft");
    }
    expect(getRenderedText()).toContain("owner:user-b");
    expect(getOwnerId()).toBe("user-b");
  });
});
