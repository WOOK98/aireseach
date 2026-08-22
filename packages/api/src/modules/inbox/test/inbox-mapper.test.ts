/**
 * Evidence Inbox — mapper unit tests (#165)
 *
 * Covers:
 *   1. createInboxItemInputSchema validation (url required for url/x_post,
 *      rawText required for paste, strict keys, size caps)
 *   2. buildEvidenceRef output passes #117 evidenceRefSchema
 *   3. buildDraftArtifact output passes draftNoteArtifactSchema
 *   4. deterministic evidence id (re-convert never duplicates)
 *   5. source attribution fallbacks (author → host → 手动粘贴)
 */
import { describe, expect, it } from "vitest";

import { draftNoteArtifactSchema } from "@workspace/shared/schema/article";
import { evidenceRefSchema } from "@workspace/shared/schema/article";

import {
  buildDraftArtifact,
  buildEvidenceRef,
  createInboxItemInputSchema,
  evidenceIdForItem,
  hostOf,
  patchInboxItemInputSchema,
} from "../inbox-mapper";

// ── Fixtures ──────────────────────────────────────────────────────────────

const BASE_ROW = {
  id: "inbox_abc123",
  sourceType: "url",
  title: "NVDA HBM supply chain deep dive",
  url: "https://example.com/nvda-hbm",
  author: "Jane Analyst",
  publishedAt: "2026-08-20",
  rawText: null,
  status: "inbox",
  noteId: null,
  createdAt: new Date("2026-08-21T10:00:00Z"),
  updatedAt: new Date("2026-08-21T10:00:00Z"),
};

// ── createInboxItemInputSchema ────────────────────────────────────────────

describe("createInboxItemInputSchema", () => {
  it("accepts a valid url item", () => {
    const r = createInboxItemInputSchema.safeParse({
      sourceType: "url",
      title: "Test",
      url: "https://example.com/a",
    });
    expect(r.success).toBe(true);
  });

  it("rejects url type without url", () => {
    const r = createInboxItemInputSchema.safeParse({
      sourceType: "url",
      title: "Test",
    });
    expect(r.success).toBe(false);
  });

  it("rejects x_post type without url", () => {
    const r = createInboxItemInputSchema.safeParse({
      sourceType: "x_post",
      title: "Thread",
    });
    expect(r.success).toBe(false);
  });

  it("rejects paste type without rawText", () => {
    const r = createInboxItemInputSchema.safeParse({
      sourceType: "paste",
      title: "Notes",
    });
    expect(r.success).toBe(false);
  });

  it("accepts paste with rawText and no url", () => {
    const r = createInboxItemInputSchema.safeParse({
      sourceType: "paste",
      title: "My notes",
      rawText: "Some pasted content about semiconductors.",
    });
    expect(r.success).toBe(true);
  });

  it("rejects rawText over 50000 chars", () => {
    const r = createInboxItemInputSchema.safeParse({
      sourceType: "paste",
      title: "Huge",
      rawText: "x".repeat(50001),
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown keys (strict)", () => {
    const r = createInboxItemInputSchema.safeParse({
      sourceType: "url",
      title: "Test",
      url: "https://example.com/a",
      status: "converted", // injection attempt
    });
    expect(r.success).toBe(false);
  });

  it("rejects bad publishedAt format", () => {
    const r = createInboxItemInputSchema.safeParse({
      sourceType: "url",
      title: "Test",
      url: "https://example.com/a",
      publishedAt: "Aug 20, 2026",
    });
    expect(r.success).toBe(false);
  });

  it("accepts ISO datetime publishedAt", () => {
    const r = createInboxItemInputSchema.safeParse({
      sourceType: "url",
      title: "Test",
      url: "https://example.com/a",
      publishedAt: "2026-08-20T14:30:00Z",
    });
    expect(r.success).toBe(true);
  });
});

// ── patchInboxItemInputSchema ─────────────────────────────────────────────

describe("patchInboxItemInputSchema", () => {
  it("accepts title patch", () => {
    const r = patchInboxItemInputSchema.safeParse({ title: "New title" });
    expect(r.success).toBe(true);
  });

  it("accepts status → archived", () => {
    const r = patchInboxItemInputSchema.safeParse({ status: "archived" });
    expect(r.success).toBe(true);
  });

  it("rejects status → converted (API-only transition)", () => {
    const r = patchInboxItemInputSchema.safeParse({ status: "converted" });
    expect(r.success).toBe(false);
  });

  it("rejects unknown keys", () => {
    const r = patchInboxItemInputSchema.safeParse({ noteId: "fake" });
    expect(r.success).toBe(false);
  });
});

// ── buildEvidenceRef ──────────────────────────────────────────────────────

describe("buildEvidenceRef", () => {
  it("produces a ref passing evidenceRefSchema", () => {
    const ref = buildEvidenceRef(BASE_ROW);
    expect(() => evidenceRefSchema.parse(ref)).not.toThrow();
  });

  it("uses author as source when present", () => {
    const ref = buildEvidenceRef(BASE_ROW);
    expect(ref.source).toBe("Jane Analyst");
  });

  it("falls back to host when no author", () => {
    const ref = buildEvidenceRef({ ...BASE_ROW, author: null });
    expect(ref.source).toBe("example.com");
  });

  it("falls back to 手动粘贴 for paste without author or url", () => {
    const ref = buildEvidenceRef({
      ...BASE_ROW,
      sourceType: "paste",
      author: null,
      url: null,
      rawText: "some content",
    });
    expect(ref.source).toBe("手动粘贴");
  });

  it("uses publishedAt as date when present, else capturedAt", () => {
    expect(buildEvidenceRef(BASE_ROW).date).toBe("2026-08-20");
    expect(buildEvidenceRef({ ...BASE_ROW, publishedAt: null }).date).toBe(
      "2026-08-21T10:00:00.000Z",
    );
  });

  it("is always unverified (user-captured, not pipeline-validated)", () => {
    expect(buildEvidenceRef(BASE_ROW).confidence).toBe("unverified");
  });
});

// ── buildDraftArtifact ────────────────────────────────────────────────────

describe("buildDraftArtifact", () => {
  it("produces an artifact passing draftNoteArtifactSchema", () => {
    const artifact = buildDraftArtifact(BASE_ROW);
    expect(() => draftNoteArtifactSchema.parse(artifact)).not.toThrow();
  });

  it("contains exactly one evidence ref with deterministic id", () => {
    const artifact = buildDraftArtifact(BASE_ROW);
    expect(artifact.evidence).toHaveLength(1);
    expect(artifact.evidence[0]?.id).toBe(evidenceIdForItem(BASE_ROW.id));
  });

  it("embeds full provenance in source", () => {
    const artifact = buildDraftArtifact(BASE_ROW);
    expect(artifact.source.inboxItemId).toBe(BASE_ROW.id);
    expect(artifact.source.url).toBe(BASE_ROW.url);
    expect(artifact.source.author).toBe(BASE_ROW.author);
  });

  it("handles paste items (no url, has rawText)", () => {
    const artifact = buildDraftArtifact({
      ...BASE_ROW,
      sourceType: "paste",
      url: null,
      rawText: "pasted body",
    });
    expect(artifact.source.url).toBeUndefined();
    expect(artifact.source.rawText).toBe("pasted body");
  });
});

// ── evidenceIdForItem / hostOf ────────────────────────────────────────────

describe("evidenceIdForItem", () => {
  it("is deterministic", () => {
    expect(evidenceIdForItem("x")).toBe(evidenceIdForItem("x"));
  });

  it("is namespaced", () => {
    expect(evidenceIdForItem("abc")).toBe("inbox:abc");
  });
});

describe("hostOf", () => {
  it("extracts host from valid url", () => {
    expect(hostOf("https://www.example.com/path")).toBe("www.example.com");
  });

  it("returns null for invalid url", () => {
    expect(hostOf("not-a-url")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(hostOf(null)).toBeNull();
  });
});
