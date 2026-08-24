/**
 * LiveBlock schema tests (#167)
 *
 * Covers the issue's schema checklist:
 * - old notes without liveBlocks stay compatible (sanitize → [])
 * - illegal stale states rejected
 * - numeric/claim blocks without source or date rejected
 * - non-http(s) URLs rejected (server-side refresh guard)
 * - malformed blocks are dropped, never thrown (安全降级)
 */
import { describe, expect, it } from "vitest";

import {
  liveBlockSchema,
  liveBlocksSchema,
  sanitizeLiveBlocks,
} from "../index";

const VALID_EVIDENCE_BLOCK = {
  id: "lb_1",
  type: "evidence_ref",
  title: "FY2026 收入 $115B",
  source: "NVIDIA 10-K",
  sourceUrl: "https://example.com/10k",
  sourceType: "evidence",
  evidenceIds: ["E3"],
  content: {
    claim: "FY2026 收入 $115B，同比 +140%",
    date: "2026-01-31",
    confidence: "verified",
  },
  capturedAt: "2026-08-24T00:00:00.000Z",
  staleState: "fresh",
} as const;

const VALID_EXCERPT_BLOCK = {
  id: "lb_2",
  type: "source_excerpt",
  title: "管理层指引摘录",
  source: "Q2 earnings call",
  sourceType: "inbox",
  evidenceIds: [],
  content: { excerpt: "We expect data center demand to remain strong." },
  capturedAt: "2026-08-24T00:00:00.000Z",
  staleState: "manual_only",
} as const;

describe("liveBlockSchema", () => {
  it("accepts a valid evidence_ref block", () => {
    expect(liveBlockSchema.safeParse(VALID_EVIDENCE_BLOCK).success).toBe(true);
  });

  it("accepts a valid source_excerpt block", () => {
    expect(liveBlockSchema.safeParse(VALID_EXCERPT_BLOCK).success).toBe(true);
  });

  it("rejects an illegal staleState", () => {
    const res = liveBlockSchema.safeParse({
      ...VALID_EVIDENCE_BLOCK,
      staleState: "maybe_fresh",
    });
    expect(res.success).toBe(false);
  });

  it("rejects a claim block missing source", () => {
    const res = liveBlockSchema.safeParse({
      ...VALID_EVIDENCE_BLOCK,
      source: "",
    });
    expect(res.success).toBe(false);
  });

  it("rejects a claim block missing date", () => {
    const res = liveBlockSchema.safeParse({
      ...VALID_EVIDENCE_BLOCK,
      content: { ...VALID_EVIDENCE_BLOCK.content, date: "" },
    });
    expect(res.success).toBe(false);
  });

  it("rejects an excerpt block missing excerpt text", () => {
    const res = liveBlockSchema.safeParse({
      ...VALID_EXCERPT_BLOCK,
      content: { excerpt: "" },
    });
    expect(res.success).toBe(false);
  });

  it("rejects non-http(s) sourceUrl", () => {
    const res = liveBlockSchema.safeParse({
      ...VALID_EVIDENCE_BLOCK,
      sourceUrl: "ftp://internal.host/file",
    });
    expect(res.success).toBe(false);
  });

  it("rejects unparseable capturedAt", () => {
    const res = liveBlockSchema.safeParse({
      ...VALID_EVIDENCE_BLOCK,
      capturedAt: "not-a-date",
    });
    expect(res.success).toBe(false);
  });

  it("rejects unknown block types", () => {
    const res = liveBlockSchema.safeParse({
      ...VALID_EVIDENCE_BLOCK,
      type: "metric_snapshot",
    });
    expect(res.success).toBe(false);
  });
});

describe("sanitizeLiveBlocks (old-note compat + 安全降级)", () => {
  it("returns [] for notes that never had liveBlocks", () => {
    expect(sanitizeLiveBlocks(undefined)).toEqual([]);
    expect(sanitizeLiveBlocks(null)).toEqual([]);
    expect(sanitizeLiveBlocks("garbage")).toEqual([]);
  });

  it("keeps valid blocks and drops malformed ones without throwing", () => {
    const out = sanitizeLiveBlocks([
      VALID_EVIDENCE_BLOCK,
      { id: "bad", type: "evidence_ref" },
      42,
      VALID_EXCERPT_BLOCK,
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]?.id).toBe("lb_1");
    expect(out[1]?.id).toBe("lb_2");
  });

  it("liveBlocksSchema caps a note at 50 blocks", () => {
    const many = Array.from({ length: 51 }, (_, i) => ({
      ...VALID_EXCERPT_BLOCK,
      id: `lb_${i}`,
    }));
    expect(liveBlocksSchema.safeParse(many).success).toBe(false);
    expect(liveBlocksSchema.safeParse(many.slice(0, 50)).success).toBe(true);
  });
});
