/**
 * Mounted NoteBlockEditor — exercises the REAL component wiring.
 *
 * Deleting the real editor's handleKeyDown/handleAnalyze breaks these tests
 * because they render the actual NoteBlockEditor component, type into its
 * textarea, and assert that the article API is called (or not called).
 *
 * Uses ReactDOM.createRoot directly because @testing-library/react render()
 * does not flush React 19 concurrent rendering in jsdom.
 *
 * Covers:
 * - /分析 TSLA → Enter → fetch /api/article/generate called with "TSLA"
 * - /分析 蔚蓝生物 → Enter → fetch called with "蔚蓝生物"
 * - IME composition guard: compositionStart → Enter → fetch NOT called
 * - IME composition end → Enter → fetch called
 */
import { act } from "react";
import React from "react";
import ReactDOM from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NoteBlockEditor } from "./note-block-editor";

import type { NoteBlock } from "@workspace/shared/schema/note-block";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("~/modules/notes/use-notes", () => ({
  patchNote: vi.fn<() => Promise<unknown>>().mockResolvedValue({}),
}));

vi.mock("~/modules/workspace/use-auto-save", () => ({
  useAutoSave: () => ({
    status: "saved" as const,
    saveNow: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    lastSavedAt: new Date(),
  }),
}));

vi.mock("~/modules/workspace/save-status", () => ({
  SaveStatusIndicator: () => null,
}));

vi.mock("~/modules/workspace/visual-block-renderer", () => ({
  VisualBlockRenderer: () => null,
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeNote(blocks: NoteBlock[]) {
  return {
    id: "test-note-1",
    title: "Test Note",
    summary: null,
    note: null,
    tags: [],
    kind: "article",
    entityTicker: null,
    entityName: null,
    schemaVersion: 1,
    evidenceCount: 0,
    asOf: "2026-09-07",
    createdAt: "2026-09-07T00:00:00Z",
    updatedAt: "2026-09-07T00:00:00Z",
    artifact: {},
    evidenceIds: [],
    liveBlocks: [],
    blocks,
    sourceMeta: null,
  } as unknown as Parameters<typeof NoteBlockEditor>[0]["note"];
}

function paraBlock(text: string): NoteBlock {
  return {
    id: `block-${Math.random().toString(36).slice(2, 8)}`,
    type: "paragraph",
    text,
  };
}

/** Mount NoteBlockEditor into a fresh DOM container via createRoot. */
function mountEditor(blocks: NoteBlock[]) {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = ReactDOM.createRoot(div);
  const note = makeNote(blocks);
  act(() => {
    root.render(
      React.createElement(NoteBlockEditor, {
        note,
        onSaved: () => Promise.resolve(),
      }),
    );
  });
  return {
    div,
    root,
    textarea: () => div.querySelector("textarea") as HTMLTextAreaElement,
    unmount: () => {
      act(() => root.unmount());
      div.remove();
    },
  };
}

/**
 * Simulate typing text into the textarea by setting value + firing input events.
 * We cannot use userEvent (requires @testing-library/react render), so we
 * dispatch events directly and update React state via onChange.
 */
function typeText(textarea: HTMLTextAreaElement, text: string) {
  for (const char of text) {
    const prev = textarea.value;
    // Set the value as the browser would
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!.call(textarea, prev + char);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

/** Fire a keydown Enter on the textarea. */
function pressEnter(
  textarea: HTMLTextAreaElement,
  overrides?: { isComposing?: boolean },
) {
  const event = new KeyboardEvent("keydown", {
    key: "Enter",
    bubbles: true,
    cancelable: true,
    ...(overrides?.isComposing !== undefined
      ? { isComposing: overrides.isComposing }
      : {}),
  } as KeyboardEventInit);
  textarea.dispatchEvent(event);
  return event;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("NoteBlockEditor mounted — /分析 dispatch", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi
      .fn<(input: RequestInfo, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            article: {
              coreThesis: {
                thesis: "Test thesis",
                keyDriver: null,
                evidenceIds: [],
              },
              industryChain: {
                narrative: null,
                visual: { kind: "empty" },
                evidenceIds: [],
              },
              evidenceMatrix: {
                narrative: null,
                visual: { kind: "empty" },
                evidenceIds: [],
              },
              companyLayer: {
                narrative: null,
                visual: null,
                evidenceIds: [],
              },
              conclusion: {
                summary: "Done",
                risks: [],
                invalidationConditions: [],
                evidenceIds: [],
              },
              evidence: [],
            },
          }),
      } as Response);
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders textarea for paragraph block", () => {
    const { div, textarea, unmount } = mountEditor([paraBlock("")]);
    expect(textarea()).not.toBeNull();
    expect(div.querySelector("section")).not.toBeNull();
    unmount();
  });

  it("Enter after /分析 TSLA calls fetch with query 'TSLA'", () => {
    const { textarea, unmount } = mountEditor([paraBlock("")]);

    const ta = textarea();
    act(() => {
      typeText(ta, "/分析 TSLA");
    });

    act(() => {
      pressEnter(ta, { isComposing: false });
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/article/generate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ query: "TSLA" }),
      }),
    );
    unmount();
  });

  it("Enter after /分析 蔚蓝生物 calls fetch with query '蔚蓝生物'", () => {
    const { textarea, unmount } = mountEditor([paraBlock("")]);

    const ta = textarea();
    act(() => {
      typeText(ta, "/分析 蔚蓝生物");
    });
    act(() => {
      pressEnter(ta, { isComposing: false });
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/article/generate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ query: "蔚蓝生物" }),
      }),
    );
    unmount();
  });

  it("Enter during IME composition does NOT call fetch", () => {
    const { textarea, unmount } = mountEditor([paraBlock("")]);

    const ta = textarea();
    act(() => {
      typeText(ta, "/分析 TSLA");
    });

    act(() => {
      ta.dispatchEvent(
        new CompositionEvent("compositionstart", { bubbles: true }),
      );
      pressEnter(ta, { isComposing: true });
      ta.dispatchEvent(
        new CompositionEvent("compositionend", { bubbles: true }),
      );
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    unmount();
  });

  it("Enter after compositionEnd dispatches analyze normally", () => {
    const { textarea, unmount } = mountEditor([paraBlock("")]);

    const ta = textarea();
    act(() => {
      typeText(ta, "/分析 TSLA");
    });

    act(() => {
      ta.dispatchEvent(
        new CompositionEvent("compositionstart", { bubbles: true }),
      );
      ta.dispatchEvent(
        new CompositionEvent("compositionend", { bubbles: true }),
      );
      pressEnter(ta, { isComposing: false });
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/article/generate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ query: "TSLA" }),
      }),
    );
    unmount();
  });
});
