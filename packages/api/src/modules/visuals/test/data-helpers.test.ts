/**
 * Data Visualization Atlas — Unit Tests
 *
 * Tests pure data helpers for all 4 panels.
 * Verifies #57 null semantics: null = missing, 0 = real zero.
 */

import { describe, expect, it } from "vitest";

import {
  computeVerificationFlow,
  computeTQSDistribution,
  hasNonNullValues,
  computeEvidenceSourceMix,
  buildManifest,
} from "../data-helpers";

// ── Panel 1: Watchlist Verification Flow ─────────────────────────────────────

describe("computeVerificationFlow", () => {
  const now = new Date("2026-08-02T12:00:00Z");

  it("returns empty states when no verifications", () => {
    const result = computeVerificationFlow([], 30, now);
    expect(result.total).toBe(0);
    expect(result.states.confirmed).toBe(0);
    expect(result.states.invalidated).toBe(0);
    expect(result.states.needs_manual_review).toBe(0);
    expect(result.states.insufficient_data).toBe(0);
    expect(result.period).toBe("Last 30 days");
  });

  it("counts verifications within 30-day window", () => {
    const verifications = [
      { result: "confirmed", verifiedAt: new Date("2026-08-01") },
      { result: "confirmed", verifiedAt: new Date("2026-07-20") },
      { result: "invalidated", verifiedAt: new Date("2026-07-15") },
    ];
    const result = computeVerificationFlow(verifications, 30, now);
    expect(result.states.confirmed).toBe(2);
    expect(result.states.invalidated).toBe(1);
    expect(result.total).toBe(3);
  });

  it("excludes verifications outside the window", () => {
    const verifications = [
      { result: "confirmed", verifiedAt: new Date("2026-08-01") },
      { result: "confirmed", verifiedAt: new Date("2026-05-01") }, // outside 30d
    ];
    const result = computeVerificationFlow(verifications, 30, now);
    expect(result.states.confirmed).toBe(1);
    expect(result.total).toBe(1);
  });

  it("excludes pending verifications", () => {
    const verifications = [
      { result: "pending", verifiedAt: new Date("2026-08-01") },
      { result: "confirmed", verifiedAt: new Date("2026-08-01") },
    ];
    const result = computeVerificationFlow(verifications, 30, now);
    expect(result.states.confirmed).toBe(1);
    expect(result.total).toBe(1);
  });

  it("handles all 4 states", () => {
    const verifications: Array<{ result: string; verifiedAt: Date }> = [
      { result: "confirmed", verifiedAt: new Date("2026-08-01") },
      { result: "invalidated", verifiedAt: new Date("2026-08-01") },
      { result: "needs_manual_review", verifiedAt: new Date("2026-08-01") },
      { result: "insufficient_data", verifiedAt: new Date("2026-08-01") },
    ];
    const result = computeVerificationFlow(verifications, 30, now);
    expect(result.states.confirmed).toBe(1);
    expect(result.states.invalidated).toBe(1);
    expect(result.states.needs_manual_review).toBe(1);
    expect(result.states.insufficient_data).toBe(1);
    expect(result.total).toBe(4);
  });

  it("90-day window includes more data than 30-day", () => {
    const verifications = [
      { result: "confirmed", verifiedAt: new Date("2026-08-01") },
      { result: "confirmed", verifiedAt: new Date("2026-06-01") }, // 62 days ago
    ];
    const d30 = computeVerificationFlow(verifications, 30, now);
    const d90 = computeVerificationFlow(verifications, 90, now);
    expect(d30.total).toBe(1);
    expect(d90.total).toBe(2);
  });

  it("ignores unknown result strings", () => {
    const verifications = [
      { result: "bogus", verifiedAt: new Date("2026-08-01") },
      { result: "confirmed", verifiedAt: new Date("2026-08-01") },
    ];
    const result = computeVerificationFlow(verifications, 30, now);
    expect(result.total).toBe(1);
  });
});

// ── Panel 2: TQS Distribution ────────────────────────────────────────────────

describe("computeTQSDistribution", () => {
  it("returns zero counts when no judgments", () => {
    const result = computeTQSDistribution([]);
    expect(result.total).toBe(0);
    expect(result.tiers.S).toBe(0);
    expect(result.tiers.F).toBe(0);
  });

  it("counts tiers correctly", () => {
    const judgments = [
      { tqsTier: "S" },
      { tqsTier: "S" },
      { tqsTier: "A" },
      { tqsTier: "B" },
      { tqsTier: "F" },
    ];
    const result = computeTQSDistribution(judgments);
    expect(result.tiers.S).toBe(2);
    expect(result.tiers.A).toBe(1);
    expect(result.tiers.B).toBe(1);
    expect(result.tiers.C).toBe(0);
    expect(result.tiers.D).toBe(0);
    expect(result.tiers.F).toBe(1);
    expect(result.total).toBe(5);
  });

  it("ignores null tqsTier", () => {
    const judgments = [{ tqsTier: null }, { tqsTier: "A" }];
    const result = computeTQSDistribution(judgments);
    expect(result.total).toBe(1);
    expect(result.tiers.A).toBe(1);
  });

  it("ignores invalid tier strings", () => {
    const judgments = [{ tqsTier: "X" }, { tqsTier: "B" }];
    const result = computeTQSDistribution(judgments);
    expect(result.total).toBe(1);
    expect(result.tiers.B).toBe(1);
  });

  it("includes disclaimer text", () => {
    const result = computeTQSDistribution([]);
    expect(result.disclaimer).toContain("TQS is not a buy/sell/hold");
    expect(result.disclaimer).toContain("bearish thesis");
  });
});

// ── Panel 3: hasNonNullValues (#57) ──────────────────────────────────────────

describe("hasNonNullValues — null semantics", () => {
  it("returns false for empty array", () => {
    expect(hasNonNullValues([])).toBe(false);
  });

  it("returns false for all-null values", () => {
    expect(hasNonNullValues([{ value: null }, { value: null }])).toBe(false);
  });

  it("returns true for at least one non-null value", () => {
    expect(hasNonNullValues([{ value: null }, { value: 42 }])).toBe(true);
  });

  it("returns true for real zero (0 != null)", () => {
    expect(hasNonNullValues([{ value: 0 }])).toBe(true);
  });

  it("null and zero are distinguishable", () => {
    const nullResult = hasNonNullValues([{ value: null }]);
    const zeroResult = hasNonNullValues([{ value: 0 }]);
    expect(nullResult).toBe(false);
    expect(zeroResult).toBe(true);
    expect(nullResult).not.toBe(zeroResult);
  });
});

// ── Panel 4: Evidence Source Mix ──────────────────────────────────────────────

describe("computeEvidenceSourceMix", () => {
  it("returns empty tiers when no judgments", () => {
    const result = computeEvidenceSourceMix([]);
    expect(result.total).toBe(0);
    expect(result.tiers.filing).toBe(0);
    expect(result.tiers.unknown).toBe(0);
  });

  it("classifies filing sources", () => {
    const judgments = [
      { source: "Company 10-K FY2025" },
      { source: "SEC EDGAR 10-Q" },
      { source: "Annual report 2024" },
    ];
    const result = computeEvidenceSourceMix(judgments);
    expect(result.tiers.filing).toBe(3);
    expect(result.total).toBe(3);
  });

  it("classifies company sources", () => {
    const judgments = [
      { source: "Investor Relations Q2 update" },
      { source: "Press release earnings" },
    ];
    const result = computeEvidenceSourceMix(judgments);
    expect(result.tiers.company).toBe(2);
  });

  it("classifies media sources", () => {
    const judgments = [
      { source: "Bloomberg report" },
      { source: "Reuters article" },
    ];
    const result = computeEvidenceSourceMix(judgments);
    expect(result.tiers.media).toBe(2);
  });

  it("classifies social sources", () => {
    const judgments = [{ source: "Reddit discussion" }];
    const result = computeEvidenceSourceMix(judgments);
    expect(result.tiers.social).toBe(1);
  });

  it("classifies null source as unknown", () => {
    const judgments = [{ source: null }];
    const result = computeEvidenceSourceMix(judgments);
    expect(result.tiers.unknown).toBe(1);
  });

  it("classifies unrecognized source as unknown", () => {
    const judgments = [{ source: "some random text" }];
    const result = computeEvidenceSourceMix(judgments);
    expect(result.tiers.unknown).toBe(1);
  });

  it("handles mixed sources", () => {
    const judgments = [
      { source: "10-K SEC filing" },
      { source: "Bloomberg analyst" },
      { source: "Reddit post" },
      { source: null },
      { source: "Investor Relations" },
    ];
    const result = computeEvidenceSourceMix(judgments);
    expect(result.tiers.filing).toBe(1);
    expect(result.tiers.media).toBe(1);
    expect(result.tiers.social).toBe(1);
    expect(result.tiers.unknown).toBe(1);
    expect(result.tiers.company).toBe(1);
    expect(result.total).toBe(5);
  });
});

// ── Manifest ─────────────────────────────────────────────────────────────────

describe("buildManifest", () => {
  it("returns 4 panels", () => {
    const manifest = buildManifest(null);
    expect(manifest.panels).toHaveLength(4);
  });

  it("sets lastRefreshed from date", () => {
    const date = new Date("2026-08-01T00:00:00Z");
    const manifest = buildManifest(date);
    expect(manifest.lastRefreshed).toBe("2026-08-01T00:00:00.000Z");
  });

  it("sets lastRefreshed to null when no date", () => {
    const manifest = buildManifest(null);
    expect(manifest.lastRefreshed).toBeNull();
  });

  it("has correct panel IDs", () => {
    const manifest = buildManifest(null);
    const ids = manifest.panels.map((p) => p.id);
    expect(ids).toContain("watchlist-verification-flow");
    expect(ids).toContain("tqs-distribution");
    expect(ids).toContain("company-fundamentals-timeline");
    expect(ids).toContain("evidence-source-mix");
  });

  it("each panel has required fields", () => {
    const manifest = buildManifest(null);
    for (const panel of manifest.panels) {
      expect(panel.title).toBeTruthy();
      expect(panel.description).toBeTruthy();
      expect(panel.dataEndpoint).toBeTruthy();
      expect(panel.fields).toBeTruthy();
      expect(panel.sourcePaths).toBeTruthy();
      expect(panel.sourcePaths.length).toBeGreaterThan(0);
    }
  });

  it("does not expose vendor names or env vars", () => {
    const manifest = buildManifest(null);
    const serialized = JSON.stringify(manifest);
    // No vendor names
    expect(serialized).not.toContain("yahoo");
    expect(serialized).not.toContain("openai");
    expect(serialized).not.toContain("deepseek");
    // No env vars
    expect(serialized).not.toContain("API_KEY");
    expect(serialized).not.toContain("process.env");
    // No internal paths
    expect(serialized).not.toContain("node_modules");
    expect(serialized).not.toContain("/packages/");
  });
});
