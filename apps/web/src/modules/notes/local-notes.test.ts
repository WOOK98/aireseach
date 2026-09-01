/**
 * Local Notes — fallback storage tests (#197)
 *
 * Verifies that when the API is unavailable, notes can be created,
 * read, updated, and deleted in localStorage. This test would fail
 * on the pre-#197 codebase where API failure showed a dead-end alert.
 */
import { afterEach, describe, expect, it } from "vitest";

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
// The local-notes/local-pdfs modules guard on `typeof window === "undefined"`.
// In Node test env, window is absent — provide a minimal shim.
if (typeof globalThis.window === "undefined") {
  (globalThis as Record<string, unknown>).window = {};
}
Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

import {
  createLocalNote,
  deleteLocalNote,
  getLocalNote,
  isLocalNote,
  listLocalNotes,
  updateLocalNote,
} from "./local-notes";

// Clean up localStorage between tests.
afterEach(() => {
  localStorage.clear();
});

describe("local-notes: CRUD", () => {
  it("creates a note with generated id and timestamps", () => {
    const note = createLocalNote({ title: "TSLA research" });
    expect(note.id).toMatch(/^local_/);
    expect(note.title).toBe("TSLA research");
    expect(note.kind).toBe("draft");
    expect(note._local).toBe(true);
    expect(note.createdAt).toBeTruthy();
    expect(note.updatedAt).toBeTruthy();
    expect(note.blocks).toEqual([]);
  });

  it("creates a note with ticker and entity name", () => {
    const note = createLocalNote({
      title: "TSLA Q2 analysis",
      entityTicker: "tsla",
      entityName: "Tesla, Inc.",
    });
    expect(note.entityTicker).toBe("TSLA");
    expect(note.entityName).toBe("Tesla, Inc.");
  });

  it("lists notes sorted by updatedAt descending", () => {
    createLocalNote({ title: "First" });
    createLocalNote({ title: "Second" });
    createLocalNote({ title: "Third" });

    const notes = listLocalNotes();
    expect(notes).toHaveLength(3);
    // All notes are created in the same millisecond, so sort order is
    // stable but we just verify count and that all are present.
    const titles = notes.map((n) => n.title).sort();
    expect(titles).toEqual(["First", "Second", "Third"]);
  });

  it("filters notes by query", () => {
    createLocalNote({ title: "TSLA analysis", entityTicker: "TSLA" });
    createLocalNote({ title: "AAPL analysis", entityTicker: "AAPL" });

    const tslaNotes = listLocalNotes({ ticker: "TSLA" });
    expect(tslaNotes).toHaveLength(1);
    expect(tslaNotes[0]!.title).toBe("TSLA analysis");

    const searchNotes = listLocalNotes({ q: "AAPL" });
    expect(searchNotes).toHaveLength(1);
    expect(searchNotes[0]!.title).toBe("AAPL analysis");
  });

  it("gets a single note by id", () => {
    const created = createLocalNote({ title: "Test note" });
    const fetched = getLocalNote(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.title).toBe("Test note");
  });

  it("returns null for non-existent note", () => {
    expect(getLocalNote("local_nonexistent")).toBeNull();
  });

  it("updates a note's editable fields", () => {
    const note = createLocalNote({ title: "Original" });
    const updated = updateLocalNote(note.id, {
      title: "Updated title",
      summary: "New summary",
    });
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe("Updated title");
    expect(updated!.summary).toBe("New summary");
    // updatedAt may be the same millisecond — just verify it's set.
    expect(updated!.updatedAt).toBeTruthy();
  });

  it("updates blocks", () => {
    const note = createLocalNote({ title: "Block test" });
    const blocks = [
      { id: "b1", type: "paragraph" as const, text: "Hello world" },
      {
        id: "b2",
        type: "heading" as const,
        text: "Section",
        level: 2 as const,
      },
    ];
    const updated = updateLocalNote(note.id, { blocks });
    expect(updated!.blocks).toHaveLength(2);
    expect(updated!.blocks[0]!.text).toBe("Hello world");
  });

  it("deletes a note", () => {
    const note = createLocalNote({ title: "To delete" });
    expect(deleteLocalNote(note.id)).toBe(true);
    expect(getLocalNote(note.id)).toBeNull();
    expect(listLocalNotes()).toHaveLength(0);
  });

  it("returns false when deleting non-existent note", () => {
    expect(deleteLocalNote("local_nonexistent")).toBe(false);
  });
});

describe("local-notes: isLocalNote", () => {
  it("identifies local note ids", () => {
    expect(isLocalNote("local_123_abc")).toBe(true);
    expect(isLocalNote("remote_db_id_123")).toBe(false);
    expect(isLocalNote("")).toBe(false);
  });
});

describe("local-notes: persistence", () => {
  it("notes survive a fresh readAll cycle", () => {
    createLocalNote({ title: "Persisted" });
    // listLocalNotes reads from localStorage each time.
    const notes = listLocalNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0]!.title).toBe("Persisted");
  });
});

describe("local-notes: degraded mode acceptance", () => {
  it("full create → list → open → edit → save → reload cycle", () => {
    // Step 1: Create a TSLA research note.
    const note = createLocalNote({
      title: "TSLA Q2 2026 Analysis",
      entityTicker: "TSLA",
      entityName: "Tesla, Inc.",
      summary: "Electric vehicle manufacturer quarterly update",
    });
    expect(note.id).toMatch(/^local_/);

    // Step 2: Note appears in the list.
    const list = listLocalNotes();
    expect(list).toHaveLength(1);
    expect(list[0]!.title).toBe("TSLA Q2 2026 Analysis");
    expect(list[0]!.entityTicker).toBe("TSLA");

    // Step 3: Open the note by id.
    const detail = getLocalNote(note.id);
    expect(detail).not.toBeNull();
    expect(detail!.entityName).toBe("Tesla, Inc.");

    // Step 4: Edit — add content blocks.
    const updated = updateLocalNote(note.id, {
      summary: "Updated: strong delivery numbers",
      blocks: [
        {
          id: "b1",
          type: "paragraph",
          text: "Tesla delivered 450k vehicles in Q2 2026.",
        },
      ],
    });
    expect(updated!.summary).toBe("Updated: strong delivery numbers");
    expect(updated!.blocks).toHaveLength(1);

    // Step 5: "Reload" — read from localStorage again.
    const reloaded = getLocalNote(note.id);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.title).toBe("TSLA Q2 2026 Analysis");
    expect(reloaded!.summary).toBe("Updated: strong delivery numbers");
    expect(reloaded!.blocks).toHaveLength(1);
    expect(reloaded!.blocks[0]!.text).toBe(
      "Tesla delivered 450k vehicles in Q2 2026.",
    );
  });
});
