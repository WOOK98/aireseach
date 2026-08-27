/**
 * Note Export — Markdown serializer tests (#180)
 *
 * Covers the issue's verification checklist:
 * - evidence metadata (source / date / period / confidence) survives export
 * - live blocks carry explicit stale / verification states
 * - missing metadata renders N/A, never 0 or fabricated freshness
 * - compliance pattern blocks the whole export (no silent partial output)
 * - file names are filesystem-safe
 */
import { describe, expect, it } from "vitest";

import { exportFileName, noteToMarkdown } from "./note-export";

import type { NoteExportInput } from "./note-export";
import type { DraftNoteArtifact } from "@workspace/shared/schema/article";
import type { LiveBlock } from "@workspace/shared/schema/live-block";
import type { ResearchArticle } from "@workspace/shared/types/article";

const EXPORTED_AT = "2026-08-27T05:30:00.000Z";

const ARTICLE: ResearchArticle = {
  schema_version: 1,
  entity: {
    resolvedName: "NVIDIA",
    ticker: "NVDA",
    exchange: "NASDAQ",
    sector: "Semiconductors",
    industry: "Accelerated Computing",
    mode: "ticker",
    dataTimestamp: "2026-08-20",
  },
  coreThesis: {
    thesis: "数据中心收入结构正在从训练转向推理。",
    keyDriver: "推理集群部署节奏",
    nonConsensus: "市场低估了推理侧的单位算力消耗。",
    evidenceIds: ["E1"],
  },
  industryChain: {
    narrative: "上游 HBM 供给仍是关键约束，中游代工产能排期拉长。",
    visual: {
      kind: "mermaid",
      title: "价值链",
      diagram: "graph LR\nA[HBM] --> B[GPU]",
      source: "供应链梳理",
      date: "2026-08",
      evidenceIds: ["E1"],
    },
    evidenceIds: ["E1"],
  },
  evidenceMatrix: {
    narrative: "三条证据支撑推理需求拐点。",
    visual: {
      kind: "matrix",
      title: "证据矩阵",
      columns: ["信号", "强度"],
      rows: [{ 信号: "云厂商资本开支指引", 强度: "强" }],
      source: "财报电话会",
      date: "2026-08",
      evidenceIds: ["E1"],
    },
    evidenceIds: ["E1"],
  },
  companyLayer: {
    narrative: "公司层面毛利率对 HBM 成本敏感。",
    visual: {
      kind: "chart",
      title: "季度收入",
      chartType: "bar",
      labels: ["Q1", "Q2"],
      series: [{ name: "收入（亿美元）", values: [260, 300] }],
      source: "公司财报",
      date: "2026-08",
      evidenceIds: ["E1"],
    },
    evidenceIds: ["E1"],
  },
  conclusion: {
    summary: "推理需求是未来四个季度的主线。",
    risks: [
      {
        risk: "HBM 供给恢复慢于预期",
        explanation: "产能爬坡不及指引",
        evidenceIds: ["E1"],
      },
      { risk: "大客户自研芯片替代", evidenceIds: ["E1"] },
    ],
    invalidationConditions: [
      {
        condition: "数据中心收入环比转负",
        metric: "环比增速",
        threshold: "< 0%",
      },
      { condition: "推理占比停止提升" },
    ],
    evidenceIds: ["E1"],
  },
  evidence: [
    {
      id: "E1",
      claim: "FY2026 Q2 数据中心收入同比增长 56%",
      source: "NVIDIA 10-Q",
      date: "2026-07-31",
      url: "https://example.com/10q",
      confidence: "verified",
    },
  ],
  generatedAt: "2026-08-20T10:00:00.000Z",
  language: "zh",
  disclaimer: "本内容由 AI 生成，仅供研究参考，不构成投资建议。",
};

const DRAFT: DraftNoteArtifact = {
  kind: "draft",
  schema_version: 1,
  evidence: [
    {
      id: "E9",
      claim: "某公司宣布新订单",
      source: "收件箱剪藏",
      date: "2026-08-15",
      confidence: "unverified",
    },
  ],
  source: {
    inboxItemId: "in_1",
    sourceType: "url",
    title: "供应链新闻",
    url: "https://example.com/news",
    author: "记者甲",
    publishedAt: "2026-08-14",
    rawText: "原文第一段。\n原文第二段。",
  },
  capturedAt: "2026-08-15T02:00:00.000Z",
};

const STALE_BLOCK: LiveBlock = {
  id: "lb_1",
  type: "evidence_ref",
  title: "FY2026 收入",
  source: "NVIDIA 10-K",
  sourceUrl: "https://example.com/10k",
  sourceType: "evidence",
  evidenceIds: ["E1"],
  content: { claim: "收入 $115B", date: "2026-01-31", confidence: "partial" },
  capturedAt: "2026-08-01T00:00:00.000Z",
  staleState: "stale",
};

const FAILED_BLOCK: LiveBlock = {
  id: "lb_2",
  type: "source_excerpt",
  title: "电话会摘录",
  source: "Q2 earnings call",
  sourceType: "manual",
  evidenceIds: [],
  content: { excerpt: "管理层强调推理需求。" },
  capturedAt: "2026-08-20T12:34:00.000Z",
  lastRefreshedAt: "2026-08-26T01:00:00.000Z",
  staleState: "failed",
  refreshError: "Source could not be reached. Showing last saved content.",
};

function articleNote(
  overrides: Partial<NoteExportInput> = {},
): NoteExportInput {
  return {
    title: "NVDA 推理拐点跟踪",
    summary: "推理侧需求是未来四个季度主线。",
    note: "下次财报重点看数据中心环比。",
    tags: ["半导体", "AI"],
    kind: "article",
    entityTicker: "NVDA",
    entityName: "NVIDIA",
    evidenceCount: 1,
    asOf: "2026-08-20",
    artifact: ARTICLE,
    liveBlocks: [STALE_BLOCK, FAILED_BLOCK],
    ...overrides,
  };
}

describe("article note export", () => {
  it("serializes all sections with evidence metadata", () => {
    const result = noteToMarkdown(articleNote(), EXPORTED_AT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const md = result.markdown;
    expect(md).toContain("# NVDA 推理拐点跟踪");
    expect(md).toContain("快照时间：2026-08-20");
    expect(md).toContain("实体：NVIDIA（NVDA）");
    expect(md).toContain("标签：半导体、AI");
    expect(md).toContain("## 核心论点");
    expect(md).toContain("## 产业链");
    expect(md).toContain("```mermaid");
    expect(md).toContain("## 证据矩阵");
    expect(md).toContain("| 信号 | 强度 |");
    expect(md).toContain("## 结论");
    expect(md).toContain("### 失效条件");
    expect(md).toContain("指标：环比增速 · 阈值：< 0%");
    expect(md).toContain("## 证据清单");
    expect(md).toContain("来源：NVIDIA 10-Q · 日期：2026-07-31 · 核实：已核实");
    expect(md).toContain("本内容由 AI 生成");
    expect(md).toContain(`导出于 ${EXPORTED_AT}`);
  });

  it("serializes charts as data tables so numbers survive", () => {
    const result = noteToMarkdown(articleNote(), EXPORTED_AT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.markdown).toContain("| 指标 | 收入（亿美元） |");
    expect(result.markdown).toContain("| Q1 | 260 |");
  });

  it("missing optional metadata renders N/A, never 0 or empty", () => {
    const sparse = articleNote({
      entityTicker: null,
      entityName: null,
      summary: null,
      note: null,
      tags: [],
    });
    const result = noteToMarkdown(sparse, EXPORTED_AT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.markdown).toContain("实体：N/A");
    expect(result.markdown).not.toContain("## 摘要");
    expect(result.markdown).not.toContain("## 我的批注");
    expect(result.markdown).not.toContain("标签：");
  });

  it("chart with a missing series value renders N/A, not 0", () => {
    const article: ResearchArticle = {
      ...ARTICLE,
      companyLayer: {
        ...ARTICLE.companyLayer,
        visual: {
          kind: "chart",
          title: "收入",
          chartType: "line",
          labels: ["Q1", "Q2", "Q3"],
          series: [{ name: "收入", values: [1, 2] }],
          source: "财报",
          date: "2026-08",
          evidenceIds: ["E1"],
        },
      },
    };
    const result = noteToMarkdown(
      articleNote({ artifact: article }),
      EXPORTED_AT,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.markdown).toContain("| Q3 | N/A |");
    expect(result.markdown).not.toContain("| Q3 | 0 |");
  });

  it("empty visuals carry their honest reason", () => {
    const article: ResearchArticle = {
      ...ARTICLE,
      companyLayer: {
        ...ARTICLE.companyLayer,
        visual: {
          kind: "empty",
          title: "估值对比",
          reason: "可比公司数据缺失",
        },
      },
    };
    const result = noteToMarkdown(
      articleNote({ artifact: article }),
      EXPORTED_AT,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.markdown).toContain("暂无可视化：可比公司数据缺失");
  });
});

describe("live block export", () => {
  it("exports stale and failed states explicitly", () => {
    const result = noteToMarkdown(articleNote(), EXPORTED_AT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const md = result.markdown;
    expect(md).toContain("## Live 证据块");
    expect(md).toContain("- 状态：待刷新");
    expect(md).toContain("- 状态：刷新失败");
    expect(md).toContain(
      "- 刷新失败原因：Source could not be reached. Showing last saved content.",
    );
    expect(md).toContain("- 上次刷新：2026-08-26 01:00:00");
    expect(md).toContain("> 数据日期：2026-01-31 · 核实：部分核实");
  });

  it("no blocks → explicit empty line, missing refresh time → N/A", () => {
    const result = noteToMarkdown(articleNote({ liveBlocks: [] }), EXPORTED_AT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.markdown).toContain("*暂无 Live 证据块*");

    const stale = noteToMarkdown(articleNote(), EXPORTED_AT);
    expect(stale.ok).toBe(true);
    if (!stale.ok) return;
    expect(stale.markdown).toContain("- 上次刷新：N/A");
  });
});

describe("draft note export", () => {
  it("exports provenance and raw excerpt with quote formatting", () => {
    const result = noteToMarkdown(
      articleNote({
        kind: "draft",
        artifact: DRAFT,
        entityTicker: null,
        entityName: null,
      }),
      EXPORTED_AT,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const md = result.markdown;
    expect(md).toContain("## 来源");
    expect(md).toContain("- 作者：记者甲");
    expect(md).toContain("- 发布于：2026-08-14");
    expect(md).toContain("## 原文摘录");
    expect(md).toContain("> 原文第一段。\n> 原文第二段。");
    // unverified evidence keeps its explicit state
    expect(md).toContain("核实：未核实");
    // draft has no article disclaimer section
    expect(md).not.toContain("本内容由 AI 生成");
  });
});

describe("compliance gate", () => {
  it("blocks the whole export when the final document trips the pattern", () => {
    const bad = articleNote({ note: "我的 notes: set a target price soon" });
    const result = noteToMarkdown(bad, EXPORTED_AT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("合规");
  });

  it("clean notes pass", () => {
    expect(noteToMarkdown(articleNote(), EXPORTED_AT).ok).toBe(true);
  });
});

describe("exportFileName", () => {
  it("strips filesystem-hostile characters and whitespace", () => {
    expect(
      exportFileName({ title: 'A/B 测试: "研报"?', asOf: "2026-08-20" }),
    ).toBe("A-B-测试-研报-2026-08-20.md");
  });

  it("falls back for empty titles and missing dates", () => {
    expect(exportFileName({ title: "   ", asOf: "" })).toBe(
      "research-note-unknown-date.md",
    );
  });

  it("caps very long titles", () => {
    const name = exportFileName({
      title: "长".repeat(200),
      asOf: "2026-08-20",
    });
    expect(name.length).toBeLessThanOrEqual(60 + "-2026-08-20.md".length);
  });
});
