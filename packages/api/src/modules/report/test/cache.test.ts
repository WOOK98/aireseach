import { describe, expect, it, vi } from "vitest";

import { ttlMemoize } from "../cache";

describe("ttlMemoize", () => {
  it("deduplicates concurrent in-flight calls", async () => {
    const fn = vi.fn<(_: string) => Promise<string>>(
      async (ticker: string) =>
        new Promise<string>((resolve) => {
          setTimeout(() => resolve(ticker), 10);
        }),
    );
    const cached = ttlMemoize(fn, { ttlMs: 300_000 });

    const first = cached("NVDA");
    const second = cached("NVDA");

    await expect(Promise.all([first, second])).resolves.toEqual([
      "NVDA",
      "NVDA",
    ]);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("returns cached values within the TTL", async () => {
    let now = 1_000;
    const fn = vi.fn<(_: string) => Promise<string>>(
      async (ticker: string) => `${ticker}:${now}`,
    );
    const cached = ttlMemoize(fn, { ttlMs: 300_000, now: () => now });

    await expect(cached("NVDA")).resolves.toBe("NVDA:1000");
    now += 60_000;
    await expect(cached("NVDA")).resolves.toBe("NVDA:1000");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("recomputes expired values", async () => {
    let now = 1_000;
    const fn = vi.fn<(_: string) => Promise<string>>(
      async (ticker: string) => `${ticker}:${now}`,
    );
    const cached = ttlMemoize(fn, { ttlMs: 5_000, now: () => now });

    await expect(cached("NVDA")).resolves.toBe("NVDA:1000");
    now += 5_001;
    await expect(cached("NVDA")).resolves.toBe("NVDA:6001");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("isolates cache keys", async () => {
    const fn = vi.fn<(_: string) => Promise<string>>(async (ticker: string) =>
      ticker.toUpperCase(),
    );
    const cached = ttlMemoize(fn, {
      ttlMs: 300_000,
      key: (ticker) => ticker.toUpperCase(),
    });

    await expect(cached("nvda")).resolves.toBe("NVDA");
    await expect(cached("NVDA")).resolves.toBe("NVDA");
    await expect(cached("mu")).resolves.toBe("MU");

    expect(fn).toHaveBeenCalledTimes(2);
  });
});
