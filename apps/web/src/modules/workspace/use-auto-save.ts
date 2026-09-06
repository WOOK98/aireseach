"use client";

/**
 * useAutoSave — debounced auto-save hook for the workspace document editor.
 *
 * Phase 1: reliable writing.
 * - Debounce 2s after last change
 * - Three states: "saved" | "saving" | "error"
 * - Optimistic: show "saving" immediately, confirm on success
 * - Never blocks typing — save runs in background
 * - Handles IME composition (don't save during composition)
 * - Manual save bypass for explicit user action (⌘S)
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "saved" | "saving" | "error";

interface UseAutoSaveOptions<T> {
  /** Current dirty value to watch */
  value: T;
  /** Whether the value has been edited since last save */
  dirty: boolean;
  /** Save function — returns resolved value on success */
  onSave: (value: T) => Promise<unknown>;
  /** Debounce delay in ms (default: 2000) */
  debounceMs?: number;
  /** Whether IME composition is active — suppress save during composition */
  composing?: boolean;
}

interface UseAutoSaveReturn {
  /** Current save status */
  status: SaveStatus;
  /** Force save immediately (bypasses debounce) */
  saveNow: () => Promise<void>;
  /** Last successful save timestamp */
  lastSavedAt: Date | null;
}

export function useAutoSave<T>({
  value,
  dirty,
  onSave,
  debounceMs = 2000,
  composing = false,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef<T>(value);
  const savingRef = useRef(false);
  const mountedRef = useRef(true);

  // Keep valueRef in sync
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const pendingRef = useRef<T | null>(null);
  const hasPendingRef = useRef(false);
  // Snapshot of the value at save start — prevents "saved" when newer edits exist.
  const savingSnapshotRef = useRef<T | null>(null);

  const doSave = useCallback(async () => {
    if (savingRef.current) {
      // Queue the latest value — never drop edits.
      pendingRef.current = valueRef.current;
      hasPendingRef.current = true;
      return;
    }
    savingRef.current = true;
    savingSnapshotRef.current = valueRef.current;
    if (mountedRef.current) setStatus("saving");

    try {
      await onSave(savingSnapshotRef.current);
      if (mountedRef.current) {
        // Only show "saved" if no newer edits arrived during save.
        if (valueRef.current === savingSnapshotRef.current) {
          setStatus("saved");
          setLastSavedAt(new Date());
        } else {
          // Newer edits exist — stay in "saving" and flush.
          setStatus("saving");
        }
      }
    } catch {
      if (mountedRef.current) setStatus("error");
    } finally {
      savingRef.current = false;
      savingSnapshotRef.current = null;
      // Flush queued save if value changed during the in-flight save.
      if (hasPendingRef.current) {
        hasPendingRef.current = false;
        valueRef.current = pendingRef.current!;
        pendingRef.current = null;
        // Use setTimeout to yield and let React process the state update.
        setTimeout(() => void doSave(), 0);
      }
    }
  }, [onSave]);

  // Cleanup on unmount — flush any pending save.
  // The mounted flag is set once; only cleared on true unmount.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Flush pending save on unmount (separate effect with stable doSave ref).
  const doSaveRef = useRef(doSave);
  doSaveRef.current = doSave;
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        // Flush: fire-and-forget the pending save so edits aren't lost.
        void doSaveRef.current();
      }
    };
  }, []);

  // Debounced auto-save when value changes while dirty.
  // Include `value` so the timer resets on each edit while dirty,
  // ensuring the latest value is always captured.
  useEffect(() => {
    if (!dirty || composing) return;

    // Clear previous timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Set new debounce timer
    timerRef.current = setTimeout(() => {
      void doSave();
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, dirty, composing, debounceMs, doSave]);

  // ⌘S / Ctrl+S keyboard handler
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (timerRef.current) clearTimeout(timerRef.current);
        void doSave();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [doSave]);

  const saveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await doSave();
  }, [doSave]);

  return { status, saveNow, lastSavedAt };
}
