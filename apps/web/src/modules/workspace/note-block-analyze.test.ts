/**
 * Analysis pipeline tests — validates the contract enforcement and
 * visual block serialization introduced for Codex review blockers.
 *
 * Covers:
 * - malformed-contract: researchArticleSchema rejects partial/malformed data
 * - visual block save/reopen: visual blocks survive sanitizeNoteBlocks round-trip
 * - visual block updateBlockAt: text-only patch preserves structured data
 * - blocksEqual: visual blocks with identical data compare equal
 * - invalidationConditions: schema requires them on conclusion
 * - evidenceIds: schema requires them on every section
 */
import { describe, expect, it } from "vitest";

import { researchArticleSchema } from "@workspace/shared/schema/article";
import {
  createNoteBlock,
  sanitizeNoteBlocks,
} from "@workspace/shared/schema/note-block";

import {
  blocksEqual,
  toBlocksPayload,
  updateBlockAt,
} from "./note-block-model";

import type { NoteBlock } from "@workspace/shared/schema/note-block";

let seq = 0;
const generateId = () => `test_${++seq}`;

// ── Minimal valid article fixture ────────────────────────────────────────────

const VALID_ARTICLE = {
  schema_version: 1,
  entity: {
    resolvedName: "Tesla Inc",
    ticker: "TSLA",
    exchange: "NASDAQ",
    sector: "Consumer Cyclical",
    industry: "Auto Manufacturers",
    mode: "ticker",
    dataTimestamp: "2026-09-06T00:00:00Z",
  },
  coreThesis: {
    thesis:
      "Tesla maintains EV market leadership through vertical integration and FSD technology advantage.",
    keyDriver: "FSD licensing and energy storage growth",
    nonConsensus: "Robotaxi timeline may be accelerated",
    evidenceIds: ["ev-1", "ev-2"],
  },
  industryChain: {
    narrative:
      "The EV supply chain spans raw materials (lithium, nickel), battery manufacturing, and vehicle assembly. Tesla's vertical integration from mining partnerships to in-house battery production gives it a 15-20% cost advantage.",
    visual: {
      kind: "matrix",
      title: "EV Supply Chain Comparison",
      columns: ["Company", "Battery", "Assembly", "Software"],
      rows: [
        {
          Company: "Tesla",
          Battery: "In-house",
          Assembly: "In-house",
          Software: "In-house",
        },
        {
          Company: "BYD",
          Battery: "In-house",
          Assembly: "In-house",
          Software: "Mixed",
        },
      ],
      source: "Industry Report 2026",
      date: "2026-08-01",
      evidenceIds: ["ev-3"],
    },
    evidenceIds: ["ev-3"],
  },
  evidenceMatrix: {
    narrative:
      "Tesla's Q2 2026 deliveries exceeded consensus by 8%, driven by Model Y refresh and Cybertruck ramp. Energy storage deployments grew 120% YoY.",
    visual: {
      kind: "chart",
      title: "Tesla Quarterly Deliveries",
      chartType: "bar",
      labels: ["Q1", "Q2", "Q3", "Q4"],
      series: [
        { name: "2025", values: [400000, 450000, 470000, 500000] },
        { name: "2026", values: [430000, 486000, 0, 0] },
      ],
      source: "Tesla IR",
      date: "2026-07-02",
      evidenceIds: ["ev-4"],
    },
    evidenceIds: ["ev-4"],
  },
  companyLayer: {
    narrative:
      "Tesla's FSD v13 achieves L4 capability in highway scenarios. Licensing talks with multiple OEMs underway. Energy business now contributes 15% of gross profit.",
    evidenceIds: ["ev-5"],
  },
  conclusion: {
    summary:
      "Tesla's competitive moat is widening through software and energy. FSD licensing represents a high-margin recurring revenue stream with minimal capital requirements.",
    risks: [
      {
        risk: "Regulatory rollback",
        explanation: "NHTSA could impose stricter autonomy requirements",
        evidenceIds: ["ev-6"],
      },
      {
        risk: "Chinese competition",
        explanation: "BYD and NIO gaining share in key markets",
        evidenceIds: ["ev-7"],
      },
    ],
    invalidationConditions: [
      {
        condition: "FSD licensing revenue below $500M by Q4 2027",
        metric: "FSD licensing revenue",
        threshold: "$500M",
      },
      {
        condition: "Global EV market share drops below 15%",
        metric: "Global EV market share",
        threshold: "15%",
      },
    ],
    evidenceIds: ["ev-6", "ev-7"],
  },
  evidence: [
    {
      id: "ev-1",
      claim: "Tesla EV market share 18.2%",
      source: "IEA",
      date: "2026-06-01",
      confidence: "verified",
      url: "https://iea.report",
    },
    {
      id: "ev-2",
      claim: "FSD supervised miles > 5B",
      source: "Tesla Q2",
      date: "2026-07-02",
      confidence: "verified",
      url: "",
    },
    {
      id: "ev-3",
      claim: "Battery cost $92/kWh",
      source: "BloombergNEF",
      date: "2026-05-15",
      confidence: "partial",
      url: "",
    },
    {
      id: "ev-4",
      claim: "Q2 deliveries 486K",
      source: "Tesla IR",
      date: "2026-07-02",
      confidence: "verified",
      url: "",
    },
    {
      id: "ev-5",
      claim: "Energy storage 120% YoY",
      source: "Tesla 10-Q",
      date: "2026-07-25",
      confidence: "verified",
      url: "",
    },
    {
      id: "ev-6",
      claim: "NHTSA investigation pending",
      source: "NHTSA",
      date: "2026-08-10",
      confidence: "partial",
      url: "",
    },
    {
      id: "ev-7",
      claim: "BYD 2026 H1 sales 2.1M",
      source: "BYD filing",
      date: "2026-07-15",
      confidence: "verified",
      url: "",
    },
  ],
  generatedAt: "2026-09-06T00:00:00Z",
  language: "zh",
  disclaimer: "本报告仅供研究参考，不构成投资建议。",
};

// ── Malformed contract tests ─────────────────────────────────────────────────

describe("researchArticleSchema — malformed contract rejection", () => {
  it("rejects {coreThesis:{thesis:42}} — the specific case Codex flagged", () => {
    const result = researchArticleSchema.safeParse({
      coreThesis: { thesis: 42 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty object", () => {
    expect(researchArticleSchema.safeParse({}).success).toBe(false);
  });

  it("rejects null", () => {
    expect(researchArticleSchema.safeParse(null).success).toBe(false);
  });

  it("rejects article missing entity", () => {
    const { entity: _, ...noEntity } = VALID_ARTICLE;
    expect(researchArticleSchema.safeParse(noEntity).success).toBe(false);
  });

  it("rejects article with thesis too short (< 10 chars)", () => {
    const bad = structuredClone(VALID_ARTICLE);
    bad.coreThesis.thesis = "short";
    expect(researchArticleSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects article with missing evidenceIds on coreThesis", () => {
    const bad = structuredClone(VALID_ARTICLE);
    bad.coreThesis.evidenceIds = [];
    expect(researchArticleSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects article with invalidationConditions missing from conclusion", () => {
    const bad = structuredClone(VALID_ARTICLE);
    bad.conclusion.invalidationConditions = [];
    expect(researchArticleSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects article with fewer than 2 risks", () => {
    const bad = structuredClone(VALID_ARTICLE);
    bad.conclusion.risks = [
      { risk: "Only one risk", explanation: "", evidenceIds: ["ev-6"] },
    ];
    expect(researchArticleSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects article with malformed visual (chart missing series)", () => {
    const bad = structuredClone(VALID_ARTICLE);
    bad.evidenceMatrix.visual = {
      kind: "chart",
      title: "Bad chart",
      chartType: "bar",
      labels: ["A"],
      series: [],
      source: "test",
      date: "2026-01-01",
      evidenceIds: ["ev-4"],
    };
    expect(researchArticleSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects article with unreferenced evidence ID", () => {
    const bad = structuredClone(VALID_ARTICLE);
    bad.evidence.push({
      id: "ev-orphan",
      claim: "Nobody references this",
      source: "Test",
      date: "2026-01-01",
      confidence: "unverified",
      url: "",
    });
    expect(researchArticleSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects article with evidenceId referencing nonexistent evidence", () => {
    const bad = structuredClone(VALID_ARTICLE);
    bad.coreThesis.evidenceIds = ["ev-nonexistent"];
    expect(researchArticleSchema.safeParse(bad).success).toBe(false);
  });
});

describe("researchArticleSchema — valid article acceptance", () => {
  it("accepts the full valid fixture", () => {
    const result = researchArticleSchema.safeParse(VALID_ARTICLE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.coreThesis.evidenceIds).toEqual(["ev-1", "ev-2"]);
      expect(result.data.conclusion.invalidationConditions).toHaveLength(2);
      expect(result.data.evidence).toHaveLength(7);
    }
  });

  it("preserves evidenceIds on all sections after validation", () => {
    const result = researchArticleSchema.safeParse(VALID_ARTICLE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.coreThesis.evidenceIds.length).toBeGreaterThan(0);
      expect(result.data.industryChain.evidenceIds.length).toBeGreaterThan(0);
      expect(result.data.evidenceMatrix.evidenceIds.length).toBeGreaterThan(0);
      expect(result.data.companyLayer.evidenceIds.length).toBeGreaterThan(0);
      expect(result.data.conclusion.evidenceIds.length).toBeGreaterThan(0);
    }
  });

  it("preserves invalidationConditions with metric and threshold", () => {
    const result = researchArticleSchema.safeParse(VALID_ARTICLE);
    expect(result.success).toBe(true);
    if (result.success) {
      const ics = result.data.conclusion.invalidationConditions;
      expect(ics[0]).toMatchObject({
        condition: expect.any(String),
        metric: expect.any(String),
        threshold: expect.any(String),
      });
    }
  });

  it("preserves structured visual data (matrix)", () => {
    const result = researchArticleSchema.safeParse(VALID_ARTICLE);
    expect(result.success).toBe(true);
    if (result.success) {
      const visual = result.data.industryChain.visual;
      expect(visual.kind).toBe("matrix");
      if (visual.kind === "matrix") {
        expect(visual.rows).toHaveLength(2);
        expect(visual.columns).toHaveLength(4);
        expect(visual.source).toBeTruthy();
        expect(visual.evidenceIds.length).toBeGreaterThan(0);
      }
    }
  });

  it("preserves structured visual data (chart)", () => {
    const result = researchArticleSchema.safeParse(VALID_ARTICLE);
    expect(result.success).toBe(true);
    if (result.success) {
      const visual = result.data.evidenceMatrix.visual;
      expect(visual.kind).toBe("chart");
      if (visual.kind === "chart") {
        expect(visual.series).toHaveLength(2);
        expect(visual.labels).toHaveLength(4);
        expect(visual.chartType).toBe("bar");
      }
    }
  });
});

// ── Visual block serialization ───────────────────────────────────────────────

describe("visual block — save/reopen round-trip", () => {
  it("visual blocks survive sanitizeNoteBlocks", () => {
    const visualBlock: NoteBlock = {
      id: "vb-1",
      type: "visual",
      text: "Test Chart",
      data: {
        kind: "chart",
        title: "Revenue Trend",
        chartType: "bar",
        labels: ["Q1", "Q2"],
        series: [{ name: "Revenue", values: [100, 200] }],
        source: "Test Source",
        date: "2026-01-01",
        evidenceIds: ["ev-1"],
      },
    };
    const result = sanitizeNoteBlocks([visualBlock]);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe("visual");
    if (result[0]!.type === "visual") {
      expect(result[0]!.data.kind).toBe("chart");
      expect(result[0]!.data.title).toBe("Revenue Trend");
    }
  });

  it("visual blocks with mermaid data survive round-trip", () => {
    const mermaidBlock: NoteBlock = {
      id: "vb-2",
      type: "visual",
      text: "Flow Diagram",
      data: {
        kind: "mermaid",
        title: "Supply Chain",
        diagram:
          "graph TD\n  A[Raw Materials] --> B[Battery]\n  B --> C[Assembly]",
        source: "Analysis",
        date: "2026-01-01",
        evidenceIds: ["ev-1"],
      },
    };
    const result = sanitizeNoteBlocks([mermaidBlock]);
    expect(result).toHaveLength(1);
    if (result[0]!.type === "visual") {
      expect(result[0]!.data.kind).toBe("mermaid");
      if (result[0]!.data.kind === "mermaid") {
        expect(result[0]!.data.diagram).toContain("graph TD");
      }
    }
  });

  it("visual blocks with matrix data preserve all rows and columns", () => {
    const matrixBlock: NoteBlock = {
      id: "vb-3",
      type: "visual",
      text: "Comparison",
      data: {
        kind: "matrix",
        title: "Company Comparison",
        columns: ["Metric", "Tesla", "BYD"],
        rows: [
          { Metric: "Revenue", Tesla: "$96B", BYD: "$85B" },
          { Metric: "Margin", Tesla: "18%", BYD: "12%" },
          { Metric: "Deliveries", Tesla: "1.8M", BYD: "3.0M" },
        ],
        source: "Financial Data",
        date: "2026-06-01",
        evidenceIds: ["ev-1"],
      },
    };
    const result = sanitizeNoteBlocks([matrixBlock]);
    expect(result).toHaveLength(1);
    if (result[0]!.type === "visual") {
      const data = result[0]!.data;
      expect(data.kind).toBe("matrix");
      if (data.kind === "matrix") {
        expect(data.rows).toHaveLength(3);
        expect(data.columns).toHaveLength(3);
      }
    }
  });

  it("toBlocksPayload preserves visual blocks", () => {
    const blocks: NoteBlock[] = [
      { id: "p1", type: "paragraph", text: "Hello" },
      {
        id: "vb-1",
        type: "visual",
        text: "Chart",
        data: {
          kind: "chart",
          title: "Test",
          chartType: "line",
          labels: ["A", "B"],
          series: [{ name: "S1", values: [1, 2] }],
          source: "src",
          date: "2026-01-01",
          evidenceIds: ["ev-1"],
        },
      },
    ];
    const payload = toBlocksPayload(blocks);
    expect(payload).toHaveLength(2);
    expect(payload[1]!.type).toBe("visual");
  });

  it("blocksEqual compares visual blocks by data content", () => {
    const visualBlock: NoteBlock = {
      id: "vb-1",
      type: "visual",
      text: "Chart",
      data: {
        kind: "chart",
        title: "Test",
        chartType: "bar",
        labels: ["A", "B"],
        series: [{ name: "S1", values: [1, 2] }],
        source: "src",
        date: "2026-01-01",
        evidenceIds: ["ev-1"],
      },
    };
    expect(blocksEqual([visualBlock], [visualBlock])).toBe(true);

    const different = structuredClone(visualBlock);
    if (different.type === "visual" && different.data.kind === "chart") {
      different.data.series[0]!.values = [99, 100];
    }
    expect(blocksEqual([visualBlock], [different])).toBe(false);
  });
});

// ── Visual block updateBlockAt ───────────────────────────────────────────────

describe("visual block — updateBlockAt preserves data", () => {
  it("text-only patch on visual block preserves structured data", () => {
    const blocks: NoteBlock[] = [
      {
        id: "vb-1",
        type: "visual",
        text: "Original",
        data: {
          kind: "matrix",
          title: "Table",
          columns: ["A", "B"],
          rows: [{ A: "1", B: "2" }],
          source: "src",
          date: "2026-01-01",
          evidenceIds: ["ev-1"],
        },
      },
    ];
    const next = updateBlockAt(blocks, 0, { text: "Updated title" });
    expect(next[0]!.type).toBe("visual");
    if (next[0]!.type === "visual") {
      expect(next[0]!.text).toBe("Updated title");
      expect(next[0]!.data.kind).toBe("matrix");
      expect(next[0]!.data.title).toBe("Table");
    }
  });
});

// ── createNoteBlock for visual type ──────────────────────────────────────────

describe("createNoteBlock — visual type", () => {
  it("creates a visual block with empty placeholder data", () => {
    const block = createNoteBlock("visual", generateId, "My visual");
    expect(block.type).toBe("visual");
    expect(block.text).toBe("My visual");
    if (block.type === "visual") {
      expect(block.data.kind).toBe("empty");
      expect(block.data.title).toBeTruthy();
    }
  });
});
