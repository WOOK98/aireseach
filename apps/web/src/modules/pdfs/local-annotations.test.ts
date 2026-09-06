/**
 * Local annotations — fallback storage tests (#197 + Codex blockers)
 *
 * Verifies:
 * - CRUD lifecycle for annotations in localStorage
 * - User-scoped storage key isolation (P1 account isolation blocker)
 * - Quota/write error propagation (P1 false persistence blocker)
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// localStorage mock for Node test environment.
const store = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => {
    store.clear();
  },
  get length() {
    return store.size;
  },
  key: (index: number) => Array.from(store.keys())[index] ?? null,
};
if (typeof globalThis.window === "undefined") {
  (globalThis as Record<string, unknown>).window = {};
}
Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

import {
  createLocalAnnotation,
  deleteLocalAnnotation,
  isLocalAnnotation,
  listLocalAnnotations,
  localAnnotationToEvidence,
} from "./local-annotations";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("local-annotations: CRUD", () => {
  it("creates an annotation with generated id", () => {
    const ann = createLocalAnnotation("local_pdf_123", {
      page: 1,
      payload: {
        kind: "highlight",
        rects: [{ x: 0, y: 0, width: 0.5, height: 0.05 }],
        excerpt: "Revenue grew 42%",
      },
    });
    expect(ann.id).toMatch(/^local_ann_/);
    expect(ann.pdfId).toBe("local_pdf_123");
    expect(ann.page).toBe(1);
    expect(ann.kind).toBe("highlight");
  });

  it("lists annotations for a specific PDF", () => {
    createLocalAnnotation("pdf_a", {
      page: 1,
      payload: { kind: "text", anchor: { x: 0, y: 0 }, text: "Note A" },
    });
    createLocalAnnotation("pdf_b", {
      page: 1,
      payload: { kind: "text", anchor: { x: 0, y: 0 }, text: "Note B" },
    });
    createLocalAnnotation("pdf_a", {
      page: 2,
      payload: { kind: "text", anchor: { x: 0, y: 0 }, text: "Note A2" },
    });

    const aAnnotations = listLocalAnnotations("pdf_a");
    expect(aAnnotations).toHaveLength(2);
    const bAnnotations = listLocalAnnotations("pdf_b");
    expect(bAnnotations).toHaveLength(1);
  });

  it("deletes an annotation", () => {
    const ann = createLocalAnnotation("pdf_1", {
      page: 1,
      payload: { kind: "text", anchor: { x: 0, y: 0 }, text: "Delete me" },
    });
    expect(deleteLocalAnnotation(ann.id)).toBe(true);
    expect(listLocalAnnotations("pdf_1")).toHaveLength(0);
  });

  it("returns false when deleting non-existent annotation", () => {
    expect(deleteLocalAnnotation("local_ann_nonexistent")).toBe(false);
  });
});

describe("local-annotations: user-scoped storage keys", () => {
  it("uses default key when no user ID is set", () => {
    createLocalAnnotation("pdf_1", {
      page: 1,
      payload: { kind: "text", anchor: { x: 0, y: 0 }, text: "test" },
    });
    // Data should be stored under a user-scoped key, not a global one.
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("airesearch:localAnnotations:")) keys.push(key);
    }
    expect(keys).toHaveLength(1);
    expect(keys[0]).toContain("airesearch:localAnnotations:");
  });

  it("uses user-specific key when user ID is set", () => {
    localStorage.setItem("__airesearch_user_id", "user_abc");
    createLocalAnnotation("pdf_1", {
      page: 1,
      payload: { kind: "text", anchor: { x: 0, y: 0 }, text: "test" },
    });
    // Data should be under user_abc's key.
    const raw = localStorage.getItem("airesearch:localAnnotations:user_abc");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
  });

  it("different users see different annotations (account isolation)", () => {
    // User A creates an annotation.
    localStorage.setItem("__airesearch_user_id", "user_a");
    createLocalAnnotation("pdf_1", {
      page: 1,
      payload: { kind: "text", anchor: { x: 0, y: 0 }, text: "User A note" },
    });

    // User B should NOT see User A's annotations.
    localStorage.setItem("__airesearch_user_id", "user_b");
    expect(listLocalAnnotations("pdf_1")).toHaveLength(0);

    // User B creates their own.
    createLocalAnnotation("pdf_1", {
      page: 1,
      payload: { kind: "text", anchor: { x: 0, y: 0 }, text: "User B note" },
    });
    expect(listLocalAnnotations("pdf_1")).toHaveLength(1);
    expect(listLocalAnnotations("pdf_1")[0]!.payload.kind).toBe("text");

    // Switch back to User A — sees only their own.
    localStorage.setItem("__airesearch_user_id", "user_a");
    expect(listLocalAnnotations("pdf_1")).toHaveLength(1);
  });
});

describe("local-annotations: quota error propagation", () => {
  it("createLocalAnnotation throws on quota exceeded", () => {
    // Override setItem to simulate quota exceeded.
    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    };

    expect(() =>
      createLocalAnnotation("pdf_1", {
        page: 1,
        payload: { kind: "text", anchor: { x: 0, y: 0 }, text: "fails" },
      }),
    ).toThrow(/QuotaExceededError/);

    // Restore.
    localStorage.setItem = originalSetItem;
  });

  it("deleteLocalAnnotation throws on quota exceeded", () => {
    // First, create successfully.
    const ann = createLocalAnnotation("pdf_1", {
      page: 1,
      payload: { kind: "text", anchor: { x: 0, y: 0 }, text: "exists" },
    });

    // Override setItem to simulate quota exceeded on the rewrite.
    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    };

    expect(() => deleteLocalAnnotation(ann.id)).toThrow(/QuotaExceededError/);

    // Restore.
    localStorage.setItem = originalSetItem;
  });
});

describe("local-annotations: evidence conversion", () => {
  it("converts highlight annotation to evidence", () => {
    const ann = createLocalAnnotation("pdf_1", {
      page: 3,
      payload: {
        kind: "highlight",
        rects: [{ x: 0.1, y: 0.3, width: 0.4, height: 0.03 }],
        excerpt: "Operating margin reached 15.3%",
      },
    });

    const evidence = localAnnotationToEvidence(ann);
    expect(evidence.claim).toBe("Operating margin reached 15.3%");
    expect(evidence.source).toContain("page 3");
    expect(evidence.confidence).toBe("partial");
  });

  it("uses provided claim over annotation excerpt", () => {
    const ann = createLocalAnnotation("pdf_1", {
      page: 1,
      payload: {
        kind: "highlight",
        rects: [{ x: 0, y: 0, width: 0.5, height: 0.05 }],
        excerpt: "Original excerpt",
      },
    });

    const evidence = localAnnotationToEvidence(ann, "Custom claim override");
    expect(evidence.claim).toBe("Custom claim override");
  });
});

describe("local-annotations: isLocalAnnotation", () => {
  it("identifies local annotation ids", () => {
    expect(isLocalAnnotation("local_ann_123_abc")).toBe(true);
    expect(isLocalAnnotation("remote_id")).toBe(false);
  });
});
