/**
 * Live Blocks — refresher tests (#167)
 *
 * Redlines under test:
 * - never throws: network failure / non-2xx degrade to block-level failed
 * - no sourceUrl → manual_only (unverified is explicit, not silent fresh)
 * - user-visible reasons are neutral (no env / provider / internal detail)
 */
import { describe, expect, it, vi } from "vitest";

import { refreshLiveBlock, REFRESH_MESSAGES } from "../live-block-refresh";

import type { LiveBlock } from "@workspace/shared/schema/live-block";

const NOW = new Date("2026-08-24T02:00:00.000Z");

const URL_BLOCK: LiveBlock = {
  id: "lb_1",
  type: "evidence_ref",
  title: "t",
  source: "s",
  sourceUrl: "https://example.com/filing",
  sourceType: "evidence",
  evidenceIds: ["E1"],
  content: { claim: "c", date: "2026-01-31", confidence: "verified" },
  capturedAt: "2026-08-01T00:00:00.000Z",
  staleState: "stale",
};

const NO_URL_BLOCK: LiveBlock = { ...URL_BLOCK, sourceUrl: undefined };

const okResponse = () =>
  ({
    ok: true,
    status: 200,
    body: { cancel: () => Promise.resolve() },
  }) as unknown as Response;

describe("refreshLiveBlock", () => {
  it("marks blocks without a sourceUrl as manual_only", async () => {
    const out = await refreshLiveBlock(NO_URL_BLOCK, { now: () => NOW });
    expect(out.staleState).toBe("manual_only");
    expect(out.lastRefreshedAt).toBeUndefined();
    expect(out.refreshError).toBeUndefined();
  });

  it("marks reachable sources fresh with a refresh timestamp", async () => {
    const fetchFn = vi
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(okResponse());
    const out = await refreshLiveBlock(URL_BLOCK, {
      fetchFn: fetchFn as unknown as typeof fetch,
      now: () => NOW,
    });
    expect(out.staleState).toBe("fresh");
    expect(out.lastRefreshedAt).toBe("2026-08-24T02:00:00.000Z");
    expect(out.refreshError).toBeUndefined();
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("marks non-2xx as failed with a neutral reason (no throw)", async () => {
    const fetchFn = vi
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue({
        ok: false,
        status: 503,
        body: { cancel: () => Promise.resolve() },
      });
    const out = await refreshLiveBlock(URL_BLOCK, {
      fetchFn: fetchFn as unknown as typeof fetch,
      now: () => NOW,
    });
    expect(out.staleState).toBe("failed");
    expect(out.lastRefreshedAt).toBe("2026-08-24T02:00:00.000Z");
    expect(out.refreshError).toBe(REFRESH_MESSAGES.httpError(503));
    expect(out.refreshError).not.toMatch(/env|token|key|internal/i);
  });

  it("marks network errors as failed with a neutral reason (no throw)", async () => {
    const fetchFn = vi
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockRejectedValue(new Error("secret internal path /etc/passwd"));
    const out = await refreshLiveBlock(URL_BLOCK, {
      fetchFn: fetchFn as unknown as typeof fetch,
      now: () => NOW,
    });
    expect(out.staleState).toBe("failed");
    expect(out.refreshError).toBe(REFRESH_MESSAGES.unreachable);
    // Neutral: internal error text must NOT leak into the user-visible reason.
    expect(out.refreshError).not.toContain("/etc/passwd");
    expect(out.refreshError).not.toContain("secret internal");
  });

  it("falls back to manual_only when no fetch implementation exists", async () => {
    vi.stubGlobal("fetch", undefined);
    try {
      const out = await refreshLiveBlock(URL_BLOCK, { now: () => NOW });
      expect(out.staleState).toBe("manual_only");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
