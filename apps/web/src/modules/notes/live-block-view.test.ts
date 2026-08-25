/**
 * Live Blocks — view mapper tests (#167)
 *
 * Covers the issue's mapper/render checklist:
 * - missing data renders "N/A", never 0
 * - failed blocks surface a neutral reason
 * - every stale state has an explicit label (unverified ≠ no change)
 */
import { describe, expect, it } from "vitest";

import {
  blockDateLabel,
  blockKindLabel,
  blockMetaLabel,
  blockRefreshErrorLabel,
  blockSourceTypeLabel,
  canRefreshBlock,
  confidenceLabel,
  evidenceAlreadyBlocked,
  extractNoteEvidence,
  staleStateLabel,
} from "./live-block-view";

import type { LiveBlock } from "@workspace/shared/schema/live-block";

const EVIDENCE_BLOCK: LiveBlock = {
  id: "lb_1",
  type: "evidence_ref",
  title: "FY2026 收入",
  source: "NVIDIA 10-K",
  sourceUrl: "https://example.com/10k",
  sourceType: "evidence",
  evidenceIds: ["E3"],
  content: { claim: "收入 $115B", date: "2026-01-31", confidence: "verified" },
  capturedAt: "2026-08-01T00:00:00.000Z",
  staleState: "fresh",
};

const EXCERPT_BLOCK: LiveBlock = {
  id: "lb_2",
  type: "source_excerpt",
  title: "摘录",
  source: "Q2 call",
  sourceType: "manual",
  evidenceIds: [],
  content: { excerpt: "..." },
  capturedAt: "2026-08-20T12:34:00.000Z",
  staleState: "manual_only",
};

describe("staleStateLabel", () => {
  it("labels every state explicitly", () => {
    expect(staleStateLabel("fresh")).toBe("已刷新");
    expect(staleStateLabel("stale")).toBe("待刷新");
    expect(staleStateLabel("failed")).toBe("刷新失败");
    expect(staleStateLabel("manual_only")).toBe("仅手动");
  });
});

describe("date / meta labels", () => {
  it("shows the evidence date for evidence_ref blocks", () => {
    expect(blockDateLabel(EVIDENCE_BLOCK)).toBe("2026-01-31");
  });

  it("shows the capture date for excerpt blocks", () => {
    expect(blockDateLabel(EXCERPT_BLOCK)).toBe("2026-08-20");
  });

  it("missing date renders N/A, never 0 or empty", () => {
    const noDate: LiveBlock = {
      ...EVIDENCE_BLOCK,
      content: { claim: "c", date: "", confidence: "partial" },
    };
    expect(blockDateLabel(noDate)).toBe("N/A");
    expect(blockDateLabel(noDate)).not.toBe("0");
  });

  it("meta combines source and date; missing source shows N/A", () => {
    expect(blockMetaLabel(EVIDENCE_BLOCK)).toBe("NVIDIA 10-K · 2026-01-31");
    const noSource: LiveBlock = { ...EVIDENCE_BLOCK, source: " " };
    expect(blockMetaLabel(noSource)).toBe("N/A · 2026-01-31");
  });
});

describe("failed blocks", () => {
  it("surfaces the neutral stored reason", () => {
    const failed: LiveBlock = {
      ...EVIDENCE_BLOCK,
      staleState: "failed",
      refreshError:
        "Source returned an error (HTTP 503). Showing last saved content.",
    };
    expect(blockRefreshErrorLabel(failed)).toContain("HTTP 503");
  });

  it("falls back to a neutral default when no reason is stored", () => {
    const failed: LiveBlock = { ...EVIDENCE_BLOCK, staleState: "failed" };
    const label = blockRefreshErrorLabel(failed);
    expect(label).toContain("last saved content");
  });

  it("non-failed blocks have no error label", () => {
    expect(blockRefreshErrorLabel(EVIDENCE_BLOCK)).toBeNull();
  });
});

describe("canRefreshBlock", () => {
  it("url-backed blocks are refreshable", () => {
    expect(canRefreshBlock(EVIDENCE_BLOCK)).toBe(true);
  });

  it("manual-only blocks without url are not refreshable", () => {
    expect(canRefreshBlock(EXCERPT_BLOCK)).toBe(false);
  });
});

describe("extractNoteEvidence", () => {
  it("normalizes evidence from an article artifact", () => {
    const artifact = {
      schema_version: 1,
      evidence: [
        {
          id: "E1",
          claim: "c",
          source: "s",
          date: "2026-01-01",
          url: "https://example.com",
          confidence: "verified",
        },
      ],
    };
    const out = extractNoteEvidence(artifact);
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("E1");
  });

  it("drops malformed entries instead of throwing", () => {
    const artifact = {
      evidence: [
        { id: "E1" },
        null,
        "junk",
        {
          id: "E2",
          claim: "c",
          source: "s",
          date: "d",
          confidence: "partial",
        },
      ],
    };
    const out = extractNoteEvidence(artifact);
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("E2");
  });

  it("returns [] for unknown artifact shapes", () => {
    expect(extractNoteEvidence(null)).toEqual([]);
    expect(extractNoteEvidence({})).toEqual([]);
    expect(extractNoteEvidence("x")).toEqual([]);
  });
});

describe("blockKindLabel / blockSourceTypeLabel / confidenceLabel (#177)", () => {
  it("labels each block kind in document language", () => {
    expect(blockKindLabel(EVIDENCE_BLOCK)).toBe("证据引用");
    expect(blockKindLabel(EXCERPT_BLOCK)).toBe("原文摘录");
  });

  it("maps known origin lanes to human labels", () => {
    expect(blockSourceTypeLabel("evidence")).toBe("研报证据");
    expect(blockSourceTypeLabel("inbox")).toBe("收件箱");
    expect(blockSourceTypeLabel("pdf")).toBe("PDF 批注");
    expect(blockSourceTypeLabel("manual")).toBe("手动添加");
  });

  it("unknown lanes degrade to a neutral label, never a raw key", () => {
    expect(blockSourceTypeLabel("some_internal_lane")).toBe("其他来源");
    expect(blockSourceTypeLabel("")).toBe("其他来源");
  });

  it("labels every confidence state explicitly (unverified ≠ silent)", () => {
    expect(confidenceLabel("verified")).toBe("已核实");
    expect(confidenceLabel("partial")).toBe("部分核实");
    expect(confidenceLabel("unverified")).toBe("未核实");
  });
});

describe("evidenceAlreadyBlocked", () => {
  it("detects duplicates by evidence id", () => {
    expect(evidenceAlreadyBlocked([EVIDENCE_BLOCK], "E3")).toBe(true);
    expect(evidenceAlreadyBlocked([EVIDENCE_BLOCK], "E9")).toBe(false);
  });
});
