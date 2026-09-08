/* eslint-disable @typescript-eslint/unbound-method */
import { createElement, act } from "react";
import { createRoot } from "react-dom/client";
// @vitest-environment jsdom
/**
 * useAutoSave — hook-level tests using React act() + createRoot directly.
 *
 * Codex blocker #3: tests must exercise the ACTUAL useAutoSave hook,
 * not a copied internal helper.  Uses React 19's createRoot + act()
 * with controlled promises and vi.useFakeTimers.
 *
 * Covers #205 Phase 1 requirements:
 * - Concurrent save queue (never drops edits)
 * - Error handling
 * - Snapshot comparison / status transitions
 * - Debounce behaviour
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { useAutoSave, type SaveStatus } from "./use-auto-save";

// ── Test harness ────────────────────────────────────────────────────────────

interface HarnessProps {
  value: string;
  dirty: boolean;
  onSave: (value: string) => Promise<unknown>;
  debounceMs?: number;
  composing?: boolean;
}

interface HarnessResult {
  status: SaveStatus;
  lastSavedAt: Date | null;
  saveNow: () => Promise<void>;
}

/**
 * Mount the actual useAutoSave hook inside a real React root.
 * Returns a mutable `result` ref that mirrors the hook's return value
 * on every render.
 */
function renderAutoSave(props: HarnessProps) {
  const result: HarnessResult = {
    status: "saved",
    lastSavedAt: null,
    saveNow: async () => {},
  };

  let currentProps = props;
  let root: ReturnType<typeof createRoot> | null = null;

  function TestComponent() {
    const hookResult = useAutoSave({
      value: currentProps.value,
      dirty: currentProps.dirty,
      onSave: currentProps.onSave,
      debounceMs: currentProps.debounceMs,
      composing: currentProps.composing,
    });
    result.status = hookResult.status;
    result.lastSavedAt = hookResult.lastSavedAt;
    result.saveNow = hookResult.saveNow;
    return null;
  }

  const container = document.createElement("div");

  act(() => {
    root = createRoot(container);
    root.render(createElement(TestComponent));
  });

  return {
    result,
    rerender(newProps: Partial<HarnessProps>) {
      currentProps = { ...currentProps, ...newProps };
      act(() => {
        root!.render(createElement(TestComponent));
      });
    },
    unmount() {
      act(() => {
        root!.unmount();
      });
    },
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("useAutoSave (hook)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces save by default (2 s)", async () => {
    const onSave = vi
      .fn<(...args: unknown[]) => Promise<void>>()
      .mockResolvedValue(undefined);

    const { result, rerender, unmount } = renderAutoSave({
      value: "v1",
      dirty: false,
      onSave,
    });

    expect(result.status).toBe("saved");

    // Mark dirty + change value
    rerender({ value: "v2", dirty: true });

    // Immediately — still "saved" (debounce not fired)
    expect(result.status).toBe("saved");
    expect(onSave).not.toHaveBeenCalled();

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("v2");
    expect(result.status).toBe("saved");

    unmount();
  });

  it("resets debounce timer on rapid edits — saves latest value", async () => {
    const onSave = vi
      .fn<(...args: unknown[]) => Promise<void>>()
      .mockResolvedValue(undefined);

    const {
      result: _result,
      rerender,
      unmount,
    } = renderAutoSave({
      value: "v1",
      dirty: false,
      onSave,
    });

    rerender({ value: "v2", dirty: true });
    vi.advanceTimersByTime(1000); // 1s — not yet
    rerender({ value: "v3", dirty: true });
    vi.advanceTimersByTime(1000); // another 1s — timer was reset
    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1000); // now 2s after v3
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("v3");

    unmount();
  });

  it("sets error status on save failure", async () => {
    const onSave = vi
      .fn<(...args: unknown[]) => Promise<void>>()
      .mockRejectedValue(new Error("network"));

    const { result, rerender, unmount } = renderAutoSave({
      value: "v1",
      dirty: false,
      onSave,
    });

    rerender({ value: "v2", dirty: true });
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.status).toBe("error");

    unmount();
  });

  it("does not save when not dirty", async () => {
    const onSave = vi
      .fn<(...args: unknown[]) => Promise<void>>()
      .mockResolvedValue(undefined);

    const { rerender: _rerender, unmount: _unmount } = renderAutoSave({
      value: "v1",
      dirty: false,
      onSave,
    });

    _rerender({ value: "v2", dirty: false });

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(onSave).not.toHaveBeenCalled();

    _unmount();
  });

  it("saveNow bypasses debounce", async () => {
    const onSave = vi
      .fn<(...args: unknown[]) => Promise<void>>()
      .mockResolvedValue(undefined);

    const { result, rerender, unmount } = renderAutoSave({
      value: "v1",
      dirty: false,
      onSave,
    });

    rerender({ value: "v2", dirty: true });

    await act(async () => {
      await result.saveNow();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("v2");
    expect(result.status).toBe("saved");

    unmount();
  });

  it("suppresses save during IME composition", async () => {
    const onSave = vi
      .fn<(...args: unknown[]) => Promise<void>>()
      .mockResolvedValue(undefined);

    const {
      result: _result,
      rerender,
      unmount,
    } = renderAutoSave({
      value: "v1",
      dirty: false,
      onSave,
    });

    // Dirty + composing
    rerender({ value: "v2", dirty: true, composing: true });

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(onSave).not.toHaveBeenCalled();

    // End composition — save triggers
    rerender({ value: "v2", dirty: true, composing: false });

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(onSave).toHaveBeenCalledTimes(1);

    unmount();
  });

  it("queues second save when one is already in-flight", async () => {
    let resolveFirst!: () => void;
    const firstSave = new Promise<void>((r) => {
      resolveFirst = r;
    });
    let callCount = 0;
    const values: string[] = [];
    const onSave = vi.fn<(v: string) => Promise<void>>((v: string) => {
      callCount++;
      values.push(v);
      if (callCount === 1) return firstSave;
      return Promise.resolve();
    });

    const { result, rerender, unmount } = renderAutoSave({
      value: "v1",
      dirty: false,
      onSave,
    });

    // Trigger first save — fire-and-forget (saveNow returns a promise that
    // won't resolve until the underlying onSave resolves)
    rerender({ value: "v2", dirty: true });
    act(() => {
      void result.saveNow(); // don't await — it's blocked on firstSave
    });
    expect(result.status).toBe("saving");

    // Queue a second save while first is in-flight
    rerender({ value: "v3", dirty: true });
    act(() => {
      void result.saveNow(); // queues because savingRef is true
    });

    // First save still in-flight
    expect(onSave).toHaveBeenCalledTimes(1);

    // Resolve first — need to let microtasks run, then trigger setTimeout(0)
    // Step 1: resolve the promise (microtask queued in doSave's finally)
    resolveFirst();
    // Step 2: flush microtasks so the finally block runs and schedules setTimeout(0)
    await act(async () => {
      await Promise.resolve();
    });
    // Step 3: fire the setTimeout(0) that flushes the queued save
    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    // Both saves completed
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(values[0]).toBe("v2");
    expect(values[1]).toBe("v3");

    unmount();
  });

  it("shows 'saving' when newer edits arrive during in-flight save", async () => {
    let resolveSave!: () => void;
    const savePromise = new Promise<void>((r) => {
      resolveSave = r;
    });
    const onSave = vi
      .fn<(...args: unknown[]) => Promise<void>>()
      .mockReturnValue(savePromise);

    const { result, rerender, unmount } = renderAutoSave({
      value: "v1",
      dirty: false,
      onSave,
    });

    // Trigger save via saveNow
    rerender({ value: "v2", dirty: true });
    act(() => {
      void result.saveNow(); // fire-and-forget
    });
    expect(result.status).toBe("saving");

    // Edit while saving — this sets a new debounce timer for v3
    rerender({ value: "v3", dirty: true });
    expect(result.status).toBe("saving");

    // Fire the debounce timer for v3 — this calls doSave() which sees
    // savingRef=true and queues v3
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Resolve the first save — finally block flushes queued v3
    resolveSave();
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    // Queued save fires with v3
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave.mock.calls[1]![0]).toBe("v3");

    unmount();
  });

  it("three rapid saves: first in-flight, second and third coalesced", async () => {
    let resolveFirst!: () => void;
    const firstSave = new Promise<void>((r) => {
      resolveFirst = r;
    });
    let callCount = 0;
    const values: string[] = [];
    const onSave = vi.fn<(v: string) => Promise<void>>((v: string) => {
      callCount++;
      values.push(v);
      if (callCount === 1) return firstSave;
      return Promise.resolve();
    });

    const { result, rerender, unmount } = renderAutoSave({
      value: "v1",
      dirty: false,
      onSave,
    });

    // Trigger first save via saveNow (fire-and-forget)
    rerender({ value: "v2", dirty: true });
    act(() => {
      void result.saveNow();
    });

    // Queue second and third while first in-flight
    rerender({ value: "v3", dirty: true });
    act(() => {
      void result.saveNow();
    });
    rerender({ value: "v4", dirty: true });
    act(() => {
      void result.saveNow();
    });

    // Resolve first — finally block flushes queued save with latest value
    resolveFirst();
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    // First save with v2, then coalesced flush with latest v4
    // (v3 is superseded by v4 in the queue)
    expect(values[0]).toBe("v2");
    expect(values[values.length - 1]).toBe("v4");

    unmount();
  });
});
