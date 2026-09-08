/**
 * useAutoSave — concurrency & queue logic tests.
 *
 * Tests the internal save-queue logic by simulating the same
 * patterns the hook uses, without needing a React renderer.
 *
 * Covers #205 Phase 1 requirements:
 * - Concurrent save queue (never drops edits)
 * - Error handling
 * - Snapshot comparison
 */
import { describe, expect, it, vi } from "vitest";

type SaveFn = (value: string) => Promise<unknown>;

/**
 * Simulate the doSave queue logic from use-auto-save.ts.
 * This mirrors the hook's internal state machine:
 *   - If a save is in-flight, queue the latest value
 *   - On success, only show "saved" if no newer edits
 *   - On error, show "error"
 *   - Flush queued save after in-flight completes
 */
function createSaveQueue(onSave: SaveFn) {
  let saving = false;
  let pending: string | null = null;
  let hasPending = false;
  let savingSnapshot: string | null = null;
  let status: "saved" | "saving" | "error" = "saved";
  const statusChanges: string[] = [];

  async function doSave(valueRef: { current: string }) {
    if (saving) {
      pending = valueRef.current;
      hasPending = true;
      return;
    }
    saving = true;
    savingSnapshot = valueRef.current;
    status = "saving";
    statusChanges.push("saving");

    try {
      await onSave(savingSnapshot);
      if (valueRef.current === savingSnapshot) {
        status = "saved";
        statusChanges.push("saved");
      } else {
        status = "saving";
        statusChanges.push("saving*");
      }
    } catch {
      status = "error";
      statusChanges.push("error");
    } finally {
      saving = false;
      savingSnapshot = null;
      if (hasPending) {
        hasPending = false;
        valueRef.current = pending!;
        pending = null;
        // Flush queued save (mirrors setTimeout(() => void doSave(), 0))
        await doSave(valueRef);
      }
    }
  }

  return {
    doSave,
    getStatus: () => status,
    getStatusChanges: () => [...statusChanges],
  };
}

describe("save queue logic", () => {
  it("queues save when one is already in-flight", async () => {
    let resolveFirst!: () => void;
    const firstSave = new Promise<void>((r) => {
      resolveFirst = r;
    });
    let callCount = 0;
    const values: string[] = [];
    const onSave = vi.fn<SaveFn>((v: string) => {
      callCount++;
      values.push(v);
      if (callCount === 1) return firstSave;
      return Promise.resolve();
    });

    const queue = createSaveQueue(onSave);
    const valueRef = { current: "v2" };

    // Start first save
    const p1 = queue.doSave(valueRef);
    expect(queue.getStatus()).toBe("saving");

    // Change value while in-flight
    valueRef.current = "v3";
    const p2 = queue.doSave(valueRef);
    // Still only 1 call
    expect(onSave).toHaveBeenCalledTimes(1);

    // Resolve first
    resolveFirst();
    await p1;
    await p2;

    // Both values saved
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(values).toEqual(["v2", "v3"]);
    expect(queue.getStatus()).toBe("saved");
  });

  it("sets error on save failure", async () => {
    const onSave = vi.fn<SaveFn>().mockRejectedValue(new Error("network"));
    const queue = createSaveQueue(onSave);
    const valueRef = { current: "v1" };

    await queue.doSave(valueRef);
    expect(queue.getStatus()).toBe("error");
    expect(queue.getStatusChanges()).toEqual(["saving", "error"]);
  });

  it("shows 'saving' when newer edits arrive during in-flight save", async () => {
    let resolveSave!: () => void;
    const savePromise = new Promise<void>((r) => {
      resolveSave = r;
    });
    const onSave = vi.fn<SaveFn>().mockReturnValue(savePromise);
    const queue = createSaveQueue(onSave);
    const valueRef = { current: "v2" };

    const p = queue.doSave(valueRef);
    expect(queue.getStatus()).toBe("saving");

    // Edit while saving — triggers a second doSave which queues
    valueRef.current = "v3";
    const p2 = queue.doSave(valueRef);
    // Only 1 call so far — queued
    expect(onSave).toHaveBeenCalledTimes(1);

    // Resolve first save
    resolveSave();
    await p;
    await p2;

    // Queue flushed with v3
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenLastCalledWith("v3");
  });

  it("shows 'saved' only when no newer edits", async () => {
    const onSave = vi.fn<SaveFn>().mockResolvedValue(undefined);
    const queue = createSaveQueue(onSave);
    const valueRef = { current: "v1" };

    await queue.doSave(valueRef);
    expect(queue.getStatus()).toBe("saved");
    expect(queue.getStatusChanges()).toEqual(["saving", "saved"]);
  });

  it("three rapid saves: first in-flight, second and third queued", async () => {
    let resolveFirst!: () => void;
    const firstSave = new Promise<void>((r) => {
      resolveFirst = r;
    });
    let callCount = 0;
    const values: string[] = [];
    const onSave = vi.fn<SaveFn>((v: string) => {
      callCount++;
      values.push(v);
      if (callCount === 1) return firstSave;
      return Promise.resolve();
    });

    const queue = createSaveQueue(onSave);
    const valueRef = { current: "v1" };

    const p1 = queue.doSave(valueRef);
    valueRef.current = "v2";
    const p2 = queue.doSave(valueRef);
    valueRef.current = "v3";
    const p3 = queue.doSave(valueRef);

    resolveFirst();
    await Promise.all([p1, p2, p3]);

    // First save with v1, then queued flush with latest value v3
    // (v2 is superseded by v3 in the queue)
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(values[0]).toBe("v1");
    expect(values[1]).toBe("v3");
  });
});
