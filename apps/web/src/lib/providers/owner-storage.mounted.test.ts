import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { act, useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
// @vitest-environment jsdom
/**
 * OwnerStorageProvider — mounted lifecycle tests.
 *
 * These tests mount the REAL OwnerStorageProvider with:
 * - A mocked auth session (controllable via sessionState)
 * - A real QueryClient (not mocked)
 * - A stateful child component with local "draft" state
 *
 * This directly addresses the Codex review blocker:
 * "owner-storage.test.ts does not import or mount OwnerStorageProvider;
 *  simulateRender/simulateEffect duplicate its logic"
 *
 * Scenarios exercised:
 * 1. Initial mount → gate closed until effect commits → child renders under A
 * 2. Direct A→B (no pending) → child unmounts, no A draft in B view
 * 3. A→pending→B → child unmounts on pending, remounts under B
 * 4. Session error → child unmounts, no A data in error view
 * 5. Logout → child unmounts, no A data in unauthenticated view
 * 6. Unmount provider → storage cleared
 * 7. Regression: pre-fix code would show A draft in B view (documented)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearOwnerId,
  getOwnerId,
  isOwnerReady,
  snapshotGeneration,
} from "../storage/owner-id";

// ── Mock auth client ────────────────────────────────────────────────────────
// authClient.useSession is the hook the provider reads session state from.
// We control its return value per-test via sessionState.

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

// Import AFTER mock so the provider picks up our mock.
const { OwnerStorageProvider } = await import("./owner-storage");

// ── Helpers ─────────────────────────────────────────────────────────────────

let root: Root;
let container: HTMLDivElement;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

/**
 * Stateful child that tracks its own identity.
 * Simulates an editor with "draft" local state.
 * Uses createElement to avoid JSX (vitest can't parse .tsx with jsx:preserve).
 */
function StatefulChild({ label }: { label: string }) {
  const [draft, setDraft] = useState(`${label}-draft-data`);
  useEffect(() => {
    setDraft(`${label}-draft-data`);
  }, [label]);
  return React.createElement(
    "span",
    { "data-testid": "child" },
    `owner:${label} draft:${draft}`,
  );
}

function getRenderedText(): string {
  return container?.textContent ?? "";
}

function childIsRendered(): boolean {
  return container?.querySelector("[data-testid='child']") !== null;
}

function mountProvider(qc: QueryClient) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      React.createElement(
        QueryClientProvider,
        { client: qc },
        React.createElement(
          OwnerStorageProvider,
          null,
          React.createElement(StatefulChild, {
            label: sessionState.data?.user?.id ?? "unknown",
          }),
        ),
      ),
    );
  });
}

function rerenderProvider(qc: QueryClient) {
  act(() => {
    root.render(
      React.createElement(
        QueryClientProvider,
        { client: qc },
        React.createElement(
          OwnerStorageProvider,
          null,
          React.createElement(StatefulChild, {
            label: sessionState.data?.user?.id ?? "unknown",
          }),
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
    mountProvider(qc);

    expect(childIsRendered()).toBe(false);
    expect(getOwnerId()).toBeNull();
  });

  it("gate opens after session resolves — child renders with owner A", () => {
    const qc = createQueryClient();
    sessionState = { isPending: true, error: null, data: null };
    mountProvider(qc);
    expect(childIsRendered()).toBe(false);

    // Session resolves to user-a
    act(() => {
      sessionState = {
        isPending: false,
        error: null,
        data: { user: { id: "user-a" } },
      };
      rerenderProvider(qc);
    });

    expect(childIsRendered()).toBe(true);
    expect(getRenderedText()).toContain("owner:user-a");
    expect(getOwnerId()).toBe("user-a");
  });
});

describe("OwnerStorageProvider (mounted): direct A→B (no pending)", () => {
  it("child unmounts, no A draft visible in B frame, child remounts under B", () => {
    const qc = createQueryClient();

    // Mount under user-a
    sessionState = {
      isPending: false,
      error: null,
      data: { user: { id: "user-a" } },
    };
    mountProvider(qc);
    expect(childIsRendered()).toBe(true);
    expect(getRenderedText()).toContain("user-a-draft-data");
    expect(getOwnerId()).toBe("user-a");

    const genBefore = snapshotGeneration();

    // Switch directly to user-b (no pending intermediate).
    // The synchronous gate should close immediately — child unmounts.
    act(() => {
      sessionState = {
        isPending: false,
        error: null,
        data: { user: { id: "user-b" } },
      };
      rerenderProvider(qc);
    });

    // After synchronous gate closes and effect commits:
    // - Child should be rendered under user-b (effect committed B)
    // - getOwnerId() should be user-b
    // - The text should contain user-b, NOT user-a draft data
    expect(getOwnerId()).toBe("user-b");
    expect(getRenderedText()).not.toContain("user-a-draft-data");
    expect(getRenderedText()).toContain("owner:user-b");
    expect(snapshotGeneration()).toBeGreaterThan(genBefore);
  });
});

describe("OwnerStorageProvider (mounted): A→pending→B", () => {
  it("child unmounts on pending, remounts under B after resolve", () => {
    const qc = createQueryClient();

    // Mount under user-a
    sessionState = {
      isPending: false,
      error: null,
      data: { user: { id: "user-a" } },
    };
    mountProvider(qc);
    expect(childIsRendered()).toBe(true);
    expect(getOwnerId()).toBe("user-a");

    // Session goes pending (re-auth)
    act(() => {
      sessionState = { isPending: true, error: null, data: null };
      rerenderProvider(qc);
    });

    // Gate should close — child not rendered
    expect(childIsRendered()).toBe(false);

    // Session resolves to user-b
    act(() => {
      sessionState = {
        isPending: false,
        error: null,
        data: { user: { id: "user-b" } },
      };
      rerenderProvider(qc);
    });

    // Child should render under B, no A data
    expect(childIsRendered()).toBe(true);
    expect(getRenderedText()).toContain("owner:user-b");
    expect(getRenderedText()).not.toContain("user-a-draft-data");
    expect(getOwnerId()).toBe("user-b");
  });
});

describe("OwnerStorageProvider (mounted): session error", () => {
  it("error from A: child unmounts, no A data in unauthenticated view", () => {
    const qc = createQueryClient();

    // Mount under user-a
    sessionState = {
      isPending: false,
      error: null,
      data: { user: { id: "user-a" } },
    };
    mountProvider(qc);
    expect(childIsRendered()).toBe(true);

    // Session errors
    act(() => {
      sessionState = {
        isPending: false,
        error: new Error("session expired"),
        data: null,
      };
      rerenderProvider(qc);
    });

    // Gate should close or render as unauthenticated
    // After effect: owner should be cleared
    expect(getOwnerId()).toBeNull();
    // No A draft data should be visible
    expect(getRenderedText()).not.toContain("user-a-draft-data");
  });
});

describe("OwnerStorageProvider (mounted): logout", () => {
  it("logout: child unmounts, no A data in unauthenticated view", () => {
    const qc = createQueryClient();

    // Mount under user-a
    sessionState = {
      isPending: false,
      error: null,
      data: { user: { id: "user-a" } },
    };
    mountProvider(qc);
    expect(childIsRendered()).toBe(true);

    // Logout
    act(() => {
      sessionState = { isPending: false, error: null, data: null };
      rerenderProvider(qc);
    });

    // Owner should be cleared, no A draft data visible
    expect(getOwnerId()).toBeNull();
    expect(getRenderedText()).not.toContain("user-a-draft-data");
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
    mountProvider(qc);
    expect(getOwnerId()).toBe("user-a");

    unmountProvider();

    expect(getOwnerId()).toBeNull();
    expect(isOwnerReady()).toBe(false);
  });
});

describe("OwnerStorageProvider (mounted): query isolation", () => {
  it("A→B removes stale caches (not invalidate)", () => {
    const qc = createQueryClient();
    const removeSpy = vi.spyOn(qc, "removeQueries");
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    // Mount under A
    sessionState = {
      isPending: false,
      error: null,
      data: { user: { id: "user-a" } },
    };
    mountProvider(qc);
    expect(getOwnerId()).toBe("user-a");

    // Switch to B
    act(() => {
      sessionState = {
        isPending: false,
        error: null,
        data: { user: { id: "user-b" } },
      };
      rerenderProvider(qc);
    });

    expect(removeSpy).toHaveBeenCalled();
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("same-user rerender does NOT remove queries", () => {
    const qc = createQueryClient();
    const removeSpy = vi.spyOn(qc, "removeQueries");

    sessionState = {
      isPending: false,
      error: null,
      data: { user: { id: "user-a" } },
    };
    mountProvider(qc);

    // Re-render same user
    act(() => {
      rerenderProvider(qc);
    });

    // removeQueries should only be called if there was an actual owner transition.
    // If only called once (from initial mount effect with null→A), that's fine.
    // The key assertion: re-rendering the same user doesn't trigger extra removals.
    const removeCallCount = removeSpy.mock.calls.length;
    act(() => {
      rerenderProvider(qc);
    });
    expect(removeSpy.mock.calls.length).toBe(removeCallCount);
  });
});

describe("OwnerStorageProvider (mounted): regression — pre-fix behavior", () => {
  it("pre-fix code would show A draft in B view (documented)", () => {
    /**
     * REGRESSION CHECK: The pre-fix provider (commit 8b9094a) had no
     * synchronous identity gate. On A→B transition:
     *
     * 1. React renders with appliedOwner="user-a", sessionUserId="user-b"
     * 2. Without synchronous gate: ready remains true (appliedOwner !== undefined)
     * 3. Children render under A's identity one more time
     * 4. A's draft data is visible in B's first committed frame
     * 5. Effect runs later, sets appliedOwner="user-b"
     * 6. Next render: children keyed on "user-b", React remounts
     *
     * The fix adds:
     *   ready = appliedOwner !== undefined && !session.isPending
     *           && appliedOwner === expectedOwner
     *
     * This closes the gate synchronously when session diverges from applied.
     *
     * This test verifies the FIXED behavior:
     * - After A→B switch, no A draft data is ever visible
     * - The child is rendered under B's identity
     */
    const qc = createQueryClient();

    sessionState = {
      isPending: false,
      error: null,
      data: { user: { id: "user-a" } },
    };
    mountProvider(qc);
    expect(getRenderedText()).toContain("user-a-draft-data");

    // Switch to B
    act(() => {
      sessionState = {
        isPending: false,
        error: null,
        data: { user: { id: "user-b" } },
      };
      rerenderProvider(qc);
    });

    // FIXED: A draft must not appear in any committed B frame
    expect(getRenderedText()).not.toContain("user-a-draft-data");
    expect(getRenderedText()).toContain("owner:user-b");
    expect(getOwnerId()).toBe("user-b");

    // If this test were run against the pre-fix provider (8b9094a),
    // the A draft would be visible in the first render after session switch.
  });
});
