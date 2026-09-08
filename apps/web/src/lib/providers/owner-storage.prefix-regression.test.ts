// @vitest-environment jsdom
/**
 * Negative-control regression test: proves the CURRENT mounted test fails
 * against the PRE-FIX provider implementation.
 *
 * This file contains a copy of the pre-fix OwnerStorageProvider (no
 * synchronous gate, effect-only identity switching). We mount it with
 * the same test harness and assert that A draft LEAKS into B's committed
 * frames — confirming the regression test is real, not a tautology.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, {
  act,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { authClient } from "~/lib/auth/client";
import { clearOwnerId, getOwnerId, setOwnerId } from "~/lib/storage/owner-id";

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

// Pre-fix provider: effect-only gate, no synchronous identity check.
function PreFixOwnerStorageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = authClient.useSession();

  const [appliedOwner, setAppliedOwner] = useState<string | null | undefined>(
    undefined,
  );

  useEffect(() => {
    if (session.isPending) {
      // Pre-fix: does NOT reset appliedOwner on pending
      return;
    }
    if (session.error) {
      setOwnerId("__unauthenticated");
      setAppliedOwner(null);
      return;
    }
    const userId = session.data?.user?.id ?? null;
    if (userId) {
      setOwnerId(userId);
    } else {
      setOwnerId("__unauthenticated");
    }
    setAppliedOwner(userId);
  }, [session]);

  // Pre-fix gate: only checks appliedOwner, NOT session identity
  const ready = appliedOwner !== undefined;

  if (!ready) return null;
  return React.createElement(React.Fragment, null, children);
}

// ── Test harness ───────────────────────────────────────────────────────────

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

type FrameObservation = { text: string; hasA: boolean };
const committedFrames: FrameObservation[] = [];

function recordFrame() {
  committedFrames.push({
    text: container?.textContent ?? "",
    hasA: (container?.textContent ?? "").includes("user-a-secret-draft"),
  });
}

function StatefulChild({ owner }: { owner: string }) {
  const [draft] = useState(() => `${owner}-secret-draft`);
  const mountId = useRef(++childMountCount);

  useLayoutEffect(() => {
    recordFrame();
  });

  return React.createElement(
    "span",
    { "data-testid": "child", "data-mount-id": String(mountId.current) },
    `owner:${owner} draft:${draft} mount:${mountId.current}`,
  );
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
          PreFixOwnerStorageProvider,
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
          PreFixOwnerStorageProvider,
          null,
          React.createElement(StatefulChild, { owner: userId }),
        ),
      ),
    );
  });
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

describe("Pre-fix provider negative control: A draft leaks into B frames", () => {
  it("direct A→B exposes A draft in at least one committed frame", () => {
    const qc = createQueryClient();

    // Mount under A
    sessionState = {
      isPending: false,
      error: null,
      data: { user: { id: "user-a" } },
    };
    mountProvider(qc, "user-a");
    expect(container.textContent).toContain("user-a-secret-draft");
    expect(getOwnerId()).toBe("user-a");

    // Switch to B — pre-fix does NOT gate synchronously
    committedFrames.length = 0;
    act(() => {
      sessionState = {
        isPending: false,
        error: null,
        data: { user: { id: "user-b" } },
      };
      rerenderProvider(qc, "user-b");
    });

    // THE BUG: at least one committed frame contains A's draft
    // because the pre-fix gate (appliedOwner !== undefined) is still true
    // while appliedOwner="user-a" and session="user-b".
    const framesWithALeak = committedFrames.filter((f) =>
      f.text.includes("user-a-secret-draft"),
    );

    // This assertion PASSES with the pre-fix provider (proves the bug exists)
    // and would FAIL with the post-fix provider (proves the fix works).
    expect(framesWithALeak.length).toBeGreaterThan(0);
  });

  it("A→pending→B exposes A draft in at least one committed frame", () => {
    const qc = createQueryClient();

    sessionState = {
      isPending: false,
      error: null,
      data: { user: { id: "user-a" } },
    };
    mountProvider(qc, "user-a");
    expect(getOwnerId()).toBe("user-a");

    // Pending — pre-fix does NOT reset appliedOwner
    committedFrames.length = 0;
    act(() => {
      sessionState = { isPending: true, error: null, data: null };
      rerenderProvider(qc, "user-b");
    });

    // Pre-fix: appliedOwner is still "user-a" → ready=true → child renders
    const framesWithALeak = committedFrames.filter((f) =>
      f.text.includes("user-a-secret-draft"),
    );
    expect(framesWithALeak.length).toBeGreaterThan(0);
  });

  it("QueryClient A data persists after A→B (pre-fix does not removeQueries on identity change)", () => {
    const qc = createQueryClient();
    const aKey = ["user-data", "user-a"];
    qc.setQueryData(aKey, { userId: "user-a", notes: ["note-by-a"] });

    sessionState = {
      isPending: false,
      error: null,
      data: { user: { id: "user-a" } },
    };
    mountProvider(qc, "user-a");

    act(() => {
      sessionState = {
        isPending: false,
        error: null,
        data: { user: { id: "user-b" } },
      };
      rerenderProvider(qc, "user-b");
    });

    // Pre-fix: no removeQueries call → A data survives
    expect(qc.getQueryData(aKey)).toBeDefined();
  });
});
