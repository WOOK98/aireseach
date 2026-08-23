/**
 * Live Blocks — builder tests (#167)
 *
 * Pure-function coverage: EvidenceRef input, excerpt input, provenance
 * requirements, and the refresh-outcome merge (refresh never rewrites
 * captured content).
 */
import { describe, expect, it } from "vitest";

import {
  applyRefreshOutcome,
  buildLiveBlock,
  insertLiveBlockInputSchema,
} from "../live-block-mapper";

import type { LiveBlock } from "@workspace/shared/schema/live-block";

const DEPS = {
  generateId: () => "lb_test_1",
  now: () => new Date("2026-08-24T00:00:00.000Z"),
};

const EVIDENCE_REF = {
  id: "E3",
  claim: "FY2026 收入 $115B，同比 +140%",
  source: "NVIDIA 10-K FY2026",
  date: "2026-01-31",
  url: "https://example.com/10k",
  confidence: "verified" as const,
};

describe("insertLiveBlockInputSchema", () => {
  it("accepts evidence_ref mode", () => {
    const res = insertLiveBlockInputSchema.safeParse({
      mode: "evidence_ref",
      evidenceRef: EVIDENCE_REF,
    });
    expect(res.success).toBe(true);
  });

  it("accepts source_excerpt mode", () => {
    const res = insertLiveBlockInputSchema.safeParse({
      mode: "source_excerpt",
      title: "管理层指引",
      source: "Q2 earnings call",
      excerpt: "Demand remains strong.",
    });
    expect(res.success).toBe(true);
  });

  it("rejects unknown modes", () => {
    const res = insertLiveBlockInputSchema.safeParse({
      mode: "metric_snapshot",
      title: "x",
    });
    expect(res.success).toBe(false);
  });

  it("rejects evidence_ref without source or date (redline)", () => {
    expect(
      insertLiveBlockInputSchema.safeParse({
        mode: "evidence_ref",
        evidenceRef: { ...EVIDENCE_REF, source: "" },
      }).success,
    ).toBe(false);
    expect(
      insertLiveBlockInputSchema.safeParse({
        mode: "evidence_ref",
        evidenceRef: { ...EVIDENCE_REF, date: "" },
      }).success,
    ).toBe(false);
  });
});

describe("buildLiveBlock", () => {
  it("builds an evidence_ref block with provenance + fresh state", () => {
    const block = buildLiveBlock(
      { mode: "evidence_ref", evidenceRef: EVIDENCE_REF, sourceType: "inbox" },
      DEPS,
    );
    expect(block).not.toBeNull();
    expect(block?.id).toBe("lb_test_1");
    expect(block?.type).toBe("evidence_ref");
    expect(block?.source).toBe("NVIDIA 10-K FY2026");
    expect(block?.sourceUrl).toBe("https://example.com/10k");
    expect(block?.sourceType).toBe("inbox");
    expect(block?.evidenceIds).toEqual(["E3"]);
    expect(block?.capturedAt).toBe("2026-08-24T00:00:00.000Z");
    expect(block?.staleState).toBe("fresh");
    if (block?.type === "evidence_ref") {
      expect(block.content.date).toBe("2026-01-31");
    }
  });

  it("defaults title to a truncated claim", () => {
    const block = buildLiveBlock(
      {
        mode: "evidence_ref",
        evidenceRef: EVIDENCE_REF,
        sourceType: "evidence",
      },
      DEPS,
    );
    expect(block?.title).toBe(EVIDENCE_REF.claim);
  });

  it("builds a source_excerpt block", () => {
    const block = buildLiveBlock(
      {
        mode: "source_excerpt",
        title: "指引摘录",
        source: "Q2 call",
        sourceType: "pdf",
        excerpt: "Demand remains strong.",
        evidenceIds: [],
      },
      DEPS,
    );
    expect(block?.type).toBe("source_excerpt");
    if (block?.type === "source_excerpt") {
      expect(block.content.excerpt).toContain("Demand");
    }
  });

  it("drops empty sourceUrl to undefined", () => {
    const block = buildLiveBlock(
      {
        mode: "evidence_ref",
        evidenceRef: { ...EVIDENCE_REF, url: "" },
        sourceType: "evidence",
      },
      DEPS,
    );
    expect(block?.sourceUrl).toBeUndefined();
  });
});

describe("applyRefreshOutcome", () => {
  const base: LiveBlock = {
    id: "lb_1",
    type: "evidence_ref",
    title: "t",
    source: "s",
    sourceUrl: "https://example.com",
    sourceType: "evidence",
    evidenceIds: ["E1"],
    content: { claim: "c", date: "2026-01-31", confidence: "partial" },
    capturedAt: "2026-08-01T00:00:00.000Z",
    staleState: "fresh",
  };

  it("updates only refresh fields; captured content stays verbatim", () => {
    const next = applyRefreshOutcome(base, {
      staleState: "failed",
      lastRefreshedAt: "2026-08-24T01:00:00.000Z",
      refreshError: "Source could not be reached. Showing last saved content.",
    });
    expect(next.staleState).toBe("failed");
    expect(next.lastRefreshedAt).toBe("2026-08-24T01:00:00.000Z");
    expect(next.refreshError).toContain("last saved content");
    // Untouched:
    expect(next.content).toEqual(base.content);
    expect(next.capturedAt).toBe(base.capturedAt);
    expect(next.source).toBe(base.source);
  });

  it("clears a previous refreshError on success", () => {
    const failed: LiveBlock = { ...base, refreshError: "old error" };
    const next = applyRefreshOutcome(failed, {
      staleState: "fresh",
      lastRefreshedAt: "2026-08-24T01:00:00.000Z",
    });
    expect(next.refreshError).toBeUndefined();
    expect(next.staleState).toBe("fresh");
  });
});
