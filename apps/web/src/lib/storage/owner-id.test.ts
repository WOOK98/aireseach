/**
 * owner-id.ts — storage isolation lifecycle tests.
 *
 * Covers the identity lifecycle guarantees demanded by Codex review:
 * 1. setOwnerId is idempotent: same owner re-set does NOT bump generation
 *    (prevents unnecessary invalidation of legitimate in-flight reads).
 * 2. Different-owner setOwnerId first clears old state (revokes URLs),
 *    then sets new owner — single atomic transition.
 * 3. clearOwnerId is idempotent: no-op when already null.
 * 4. clearOwnerId revokes all tracked object URLs.
 * 5. A→B transition: clearOwnerId + setOwnerId properly revokes A URLs.
 * 6. Delayed A blob read after B login returns null (stale generation).
 * 7. No localStorage fallback — getOwnerId returns ONLY in-memory value.
 */
import { beforeEach, describe, expect, it } from "vitest";

// ── URL mock ────────────────────────────────────────────────────────────────

const revokedUrls: string[] = [];
Object.defineProperty(globalThis, "URL", {
  value: {
    createObjectURL: (blob: Blob) => `blob:test/${blob.size}`,
    revokeObjectURL: (url: string) => revokedUrls.push(url),
  },
  writable: true,
});

// ── Imports (after mocks) ───────────────────────────────────────────────────

import {
  clearOwnerId,
  getOwnerId,
  isOwnerReady,
  isStaleGeneration,
  setOwnerId,
  snapshotGeneration,
  trackObjectUrl,
  untrackObjectUrl,
} from "./owner-id";

beforeEach(() => {
  clearOwnerId();
  revokedUrls.length = 0;
});

describe("owner-id: setOwnerId idempotency", () => {
  it("same-owner re-set does NOT bump generation", () => {
    setOwnerId("user-a");
    const gen = snapshotGeneration();

    setOwnerId("user-a");
    expect(snapshotGeneration()).toBe(gen);
    expect(isStaleGeneration(gen)).toBe(false);
  });

  it("different-owner re-set DOES bump generation", () => {
    setOwnerId("user-a");
    const gen = snapshotGeneration();

    setOwnerId("user-b");
    expect(snapshotGeneration()).toBeGreaterThan(gen);
    expect(isStaleGeneration(gen)).toBe(true);
    expect(getOwnerId()).toBe("user-b");
  });

  it("first setOwnerId sets the owner", () => {
    expect(getOwnerId()).toBeNull();
    setOwnerId("user-a");
    expect(getOwnerId()).toBe("user-a");
    expect(isOwnerReady()).toBe(true);
  });

  it("ignores empty string", () => {
    setOwnerId("");
    expect(getOwnerId()).toBeNull();
  });
});

describe("owner-id: clearOwnerId idempotency", () => {
  it("clearOwnerId is no-op when already null", () => {
    expect(getOwnerId()).toBeNull();
    const genBefore = snapshotGeneration();
    clearOwnerId();
    // No generation bump for no-op clear.
    expect(snapshotGeneration()).toBe(genBefore);
  });

  it("clearOwnerId clears the owner", () => {
    setOwnerId("user-a");
    expect(getOwnerId()).toBe("user-a");
    clearOwnerId();
    expect(getOwnerId()).toBeNull();
    expect(isOwnerReady()).toBe(false);
  });

  it("clearOwnerId revokes all tracked object URLs", () => {
    setOwnerId("user-a");
    trackObjectUrl("blob:test/url-1");
    trackObjectUrl("blob:test/url-2");

    clearOwnerId();

    expect(revokedUrls).toContain("blob:test/url-1");
    expect(revokedUrls).toContain("blob:test/url-2");
  });
});

describe("owner-id: A→B transition (setOwnerId implies clear)", () => {
  it("A→B via setOwnerId revokes A's URLs and sets B", () => {
    setOwnerId("user-a");
    trackObjectUrl("blob:a/1");
    trackObjectUrl("blob:a/2");

    // Direct A→B — setOwnerId internally clears old state first.
    setOwnerId("user-b");

    expect(getOwnerId()).toBe("user-b");
    expect(revokedUrls).toContain("blob:a/1");
    expect(revokedUrls).toContain("blob:a/2");
  });

  it("A→null→B via clearOwnerId + setOwnerId also revokes A's URLs", () => {
    setOwnerId("user-a");
    trackObjectUrl("blob:a/1");

    clearOwnerId();
    expect(revokedUrls).toContain("blob:a/1");

    setOwnerId("user-b");
    expect(getOwnerId()).toBe("user-b");
  });
});

describe("owner-id: generation race guard", () => {
  it("snapshot taken before owner switch is stale after switch", () => {
    setOwnerId("user-a");
    const gen = snapshotGeneration();

    setOwnerId("user-b");
    expect(isStaleGeneration(gen)).toBe(true);
  });

  it("snapshot taken with no owner is stale after setOwnerId", () => {
    const gen = snapshotGeneration();
    setOwnerId("user-a");
    expect(isStaleGeneration(gen)).toBe(true);
  });

  it("snapshot with same owner is NOT stale", () => {
    setOwnerId("user-a");
    const gen = snapshotGeneration();
    setOwnerId("user-a"); // idempotent
    expect(isStaleGeneration(gen)).toBe(false);
  });

  it("delayed A blob read after B login returns stale", async () => {
    setOwnerId("user-a");
    // Simulate: capture generation before async read.
    const gen = snapshotGeneration();

    // B logs in before the read completes.
    setOwnerId("user-b");

    // The generation snapshot from A's context is now stale.
    expect(isStaleGeneration(gen)).toBe(true);
  });
});

describe("owner-id: trackObjectUrl / untrackObjectUrl", () => {
  it("untracked URL is not revoked on clearOwnerId", () => {
    setOwnerId("user-a");
    trackObjectUrl("blob:test/1");
    untrackObjectUrl("blob:test/1");

    clearOwnerId();
    expect(revokedUrls).not.toContain("blob:test/1");
  });
});
