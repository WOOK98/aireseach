/**
 * AleaBit — Gate tests (#119)
 *
 * Tests for classification, entity, evidence, and idempotency gates.
 * All pure functions — no external dependencies.
 */
import { describe, it, expect } from "vitest";

import { classifyContent } from "../gates/classify";
import { resolveEntity, extractEntityCandidates } from "../gates/entity";
import { evidenceGate } from "../gates/evidence";
import { buildIdempotencyKey, checkIdempotency } from "../idempotency";

import type { IdempotencyRecord } from "../idempotency";
import type {
  BriefEvidence,
  BriefMetric,
} from "@workspace/shared/types/aleabit";

// ── Classification gate ──────────────────────────────────────────────────────

describe("classifyContent", () => {
  it("classifies earnings post", () => {
    const result = classifyContent(
      "$NVDA Q2 FY2026 earnings: Revenue $30B, EPS $0.68, beat consensus estimates.",
    );
    expect(result.category).toBe("earnings");
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.skipReason).toBeUndefined();
  });

  it("classifies supply chain post", () => {
    const result = classifyContent(
      "SK Hynix HBM bottleneck: lead times extended to 52+ weeks. Supply chain constraint on AI GPU shipments.",
    );
    expect(result.category).toBe("supply_chain");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("classifies company post", () => {
    const result = classifyContent(
      "Apple acquisition of AI startup strengthens competitive moat. Market share implications significant.",
    );
    expect(result.category).toBe("company");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("skips short posts", () => {
    const result = classifyContent("gm everyone");
    expect(result.category).toBe("other");
    expect(result.skipReason).toBe("short_post");
  });

  it("skips noise posts", () => {
    const result = classifyContent(
      "Good morning! Follow me for more crypto tips and retweets!",
    );
    expect(result.category).toBe("other");
    expect(result.skipReason).toBe("noise");
  });

  it("skips posts with no financial signals", () => {
    const result = classifyContent(
      "The weather is beautiful today. I went for a walk in the park and saw some ducks.",
    );
    expect(result.category).toBe("other");
    expect(result.skipReason).toBe("no_financial_signals");
  });

  it("handles Chinese financial content", () => {
    const result = classifyContent(
      "英伟达第二季度财报超出预期，营收达到300亿美元，同比增长56%。毛利率维持在75%以上。",
    );
    expect(result.category).toBe("earnings");
    expect(result.confidence).toBeGreaterThan(0.5);
  });
});

// ── Entity gate ──────────────────────────────────────────────────────────────

describe("extractEntityCandidates", () => {
  it("extracts $TICKER mentions", () => {
    const candidates = extractEntityCandidates(
      "$NVDA earnings beat. Also watching $AMD and $INTC.",
    );
    expect(candidates.length).toBe(3);
    expect(candidates.map((c) => c.ticker)).toContain("NVDA");
    expect(candidates.map((c) => c.ticker)).toContain("AMD");
    expect(candidates.map((c) => c.ticker)).toContain("INTC");
  });

  it("extracts known company names", () => {
    const candidates = extractEntityCandidates(
      "NVIDIA reported strong earnings. TSMC is the key supplier.",
    );
    expect(candidates.length).toBe(2);
    expect(candidates.some((c) => c.ticker === "NVDA")).toBe(true);
    expect(candidates.some((c) => c.ticker === "TSM")).toBe(true);
  });

  it("deduplicates ticker and name mentions", () => {
    const candidates = extractEntityCandidates(
      "$NVDA and NVIDIA both reported strong results.",
    );
    expect(candidates.length).toBe(1);
    expect(candidates[0]!.ticker).toBe("NVDA");
  });

  it("returns empty for no entities", () => {
    const candidates = extractEntityCandidates(
      "The AI bubble is going to pop eventually.",
    );
    expect(candidates.length).toBe(0);
  });
});

describe("resolveEntity", () => {
  it("resolves single entity with high confidence", () => {
    const result = resolveEntity("$NVDA earnings beat expectations.");
    expect(result.ok).toBe(true);
    expect(result.ticker).toBe("NVDA");
    expect(result.needsReview).toBe(false);
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("flags multiple entities for review", () => {
    const result = resolveEntity(
      "$NVDA vs $AMD: NVIDIA winning the AI GPU race.",
    );
    expect(result.ok).toBe(true);
    expect(result.needsReview).toBe(true);
    expect(result.reviewReason).toContain("Multiple entities");
  });

  it("returns needsReview for no entity", () => {
    const result = resolveEntity("The market is overvalued.");
    expect(result.ok).toBe(false);
    expect(result.needsReview).toBe(true);
  });

  it("resolves Korean market ticker", () => {
    const result = resolveEntity("SK Hynix HBM bottleneck analysis.");
    expect(result.ok).toBe(true);
    expect(result.ticker).toBe("000660.KS");
    expect(result.market).toBe("KR");
  });
});

// ── Evidence gate ────────────────────────────────────────────────────────────

describe("evidenceGate", () => {
  const verifiedEvidence: BriefEvidence[] = [
    {
      id: "E1",
      claim: "Q2 FY2026 revenue $30.0B",
      source: "SEC 10-Q",
      date: "2026-08-10",
      unit: "USD",
      fiscalPeriod: "FY2026 Q2",
      confidence: "verified",
    },
    {
      id: "E2",
      claim: "Gross margin 75.1%",
      source: "SEC 10-Q",
      date: "2026-08-10",
      unit: "%",
      fiscalPeriod: "FY2026 Q2",
      confidence: "verified",
    },
    {
      id: "E3",
      claim: "Author thesis on AI infrastructure",
      source: "author_claim",
      date: "2026-08-10",
      confidence: "unverified",
    },
  ];

  const verifiedMetrics: BriefMetric[] = [
    {
      name: "Revenue",
      value: 30_000_000_000,
      unit: "USD",
      period: "FY2026 Q2",
      yoyChange: 56,
      source: "E1",
    },
    {
      name: "Gross Margin",
      value: 75.1,
      unit: "%",
      period: "FY2026 Q2",
      source: "E2",
    },
  ];

  it("allows generation with verified filing evidence", () => {
    const result = evidenceGate(verifiedEvidence, verifiedMetrics);
    expect(result.allowed).toBe(true);
    expect(result.spine.hasFilingEvidence).toBe(true);
    expect(result.spine.verifiedCount).toBe(2);
  });

  it("blocks when no filing evidence", () => {
    const noFiling: BriefEvidence[] = [
      {
        id: "E1",
        claim: "Author opinion",
        source: "author_claim",
        date: "2026-08-10",
        confidence: "unverified",
      },
    ];
    const result = evidenceGate(noFiling, []);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("No SEC/IR");
  });

  it("blocks when metrics don't trace to SEC/IR evidence", () => {
    const partialEvidence: BriefEvidence[] = [
      {
        id: "E1",
        claim: "Revenue estimate",
        source: "analyst_estimate",
        date: "2026-08-10",
        confidence: "verified",
      },
    ];
    const partialMetrics: BriefMetric[] = [
      {
        name: "Revenue",
        value: 30_000_000_000,
        unit: "USD",
        period: "FY2026 Q2",
        source: "E1",
      },
    ];
    const result = evidenceGate(partialEvidence, partialMetrics);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("SEC/IR");
  });

  it("blocks metric pointing to verified but non-filing source", () => {
    const evidence: BriefEvidence[] = [
      {
        id: "E1",
        claim: "Revenue from Bloomberg Terminal",
        source: "Bloomberg",
        date: "2026-08-10",
        confidence: "verified",
      },
    ];
    const metrics: BriefMetric[] = [
      {
        name: "Revenue",
        value: 30_000_000_000,
        unit: "USD",
        period: "FY2026 Q2",
        source: "E1",
      },
    ];
    const result = evidenceGate(evidence, metrics);
    expect(result.allowed).toBe(false);
    expect(result.spine.nonFilingMetrics).toContain("Revenue");
  });
});

// ── Idempotency ──────────────────────────────────────────────────────────────

describe("idempotency", () => {
  it("processes new conversation", () => {
    const key = buildIdempotencyKey("conv_001", ["2026-08-10T20:00:00Z"]);
    const result = checkIdempotency(key, []);
    expect(result.action).toBe("process");
  });

  it("skips exact duplicate", () => {
    const editHistory = ["2026-08-10T20:00:00Z"];
    const key = buildIdempotencyKey("conv_001", editHistory);

    const existing: IdempotencyRecord[] = [
      {
        key: buildIdempotencyKey("conv_001", editHistory),
        version: 1,
        firstSeenAt: "2026-08-10T20:00:00Z",
        lastUpdatedAt: "2026-08-10T20:00:00Z",
        status: "ready_for_review",
      },
    ];

    const result = checkIdempotency(key, existing);
    expect(result.action).toBe("skip_duplicate");
    if (result.action === "skip_duplicate") {
      expect(result.existingVersion).toBe(1);
    }
  });

  it("triggers update for edited post", () => {
    const key = buildIdempotencyKey("conv_001", [
      "2026-08-10T20:00:00Z",
      "2026-08-10T20:30:00Z",
    ]);

    const existing: IdempotencyRecord[] = [
      {
        key: buildIdempotencyKey("conv_001", ["2026-08-10T20:00:00Z"]),
        version: 1,
        firstSeenAt: "2026-08-10T20:00:00Z",
        lastUpdatedAt: "2026-08-10T20:00:00Z",
        status: "ready_for_review",
      },
    ];

    const result = checkIdempotency(key, existing);
    expect(result.action).toBe("update");
    if (result.action === "update") {
      expect(result.existingVersion).toBe(1);
    }
  });

  it("generates stable keys for same input", () => {
    const key1 = buildIdempotencyKey("conv_001", [
      "2026-08-10T20:00:00Z",
      "2026-08-10T20:30:00Z",
    ]);
    const key2 = buildIdempotencyKey("conv_001", [
      "2026-08-10T20:30:00Z",
      "2026-08-10T20:00:00Z", // reversed order
    ]);
    expect(key1.editHistoryHash).toBe(key2.editHistoryHash);
  });
});
