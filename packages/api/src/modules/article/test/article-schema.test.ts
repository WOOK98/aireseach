/**
 * Research Article MVP — Schema validation tests (#116)
 *
 * Validates that the schema blocks bad output and accepts good output.
 */
import { describe, it, expect } from "vitest";

import {
  researchArticleSchema,
  validateArticleOutput,
} from "@workspace/shared/schema/article";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_ARTICLE_JSON = JSON.stringify({
  schema_version: 1,
  entity: {
    resolvedName: "NVIDIA Corporation",
    ticker: "NVDA",
    exchange: "NASDAQ",
    sector: "Technology",
    industry: "Semiconductors",
    mode: "ticker",
    dataTimestamp: "2026-08-10",
  },
  coreThesis: {
    thesis:
      "NVIDIA 在 AI 推理芯片市场的主导地位将持续扩大，数据中心收入占比已超过 80%。",
    keyDriver: "Hopper/Blackwell 架构在大模型训练中的不可替代性 [E1]",
    nonConsensus: "市场低估了推理侧对 GPU 的长期需求 [E2]",
  },
  industryChain: {
    narrative:
      "AI 芯片产业链从上游设备材料到下游应用形成完整链条。NVIDIA 处于中游核心位置，向上绑定台积电先进制程，向下通过 CUDA 生态锁定客户 [E1]。2025 年数据中心收入达 1150 亿美元，同比增长 140% [E3]。",
    visual: {
      kind: "mermaid",
      title: "AI 芯片产业链",
      diagram:
        "graph LR\n  A[晶圆代工] --> B[芯片设计]\n  B --> C[服务器整机]\n  C --> D[云计算/推理]",
      source: "公开产业链研究",
      date: "2026-08-01",
    },
  },
  evidenceMatrix: {
    narrative:
      "关键财务指标显示 NVIDIA 收入和利润持续高增长，毛利率维持在 75% 以上 [E3]。",
    visual: {
      kind: "matrix",
      title: "NVIDIA 关键财务数据",
      columns: ["指标", "当前值", "同比变化", "来源", "日期"],
      rows: [
        {
          指标: "收入",
          当前值: "$115B",
          同比变化: "+140%",
          来源: "公司财报",
          日期: "FY2026",
        },
        {
          指标: "毛利率",
          当前值: "75.2%",
          同比变化: "+2.1pp",
          来源: "公司财报",
          日期: "FY2026",
        },
      ],
      source: "NVIDIA 10-K FY2026",
      date: "2026-01-31",
    },
  },
  companyLayer: {
    narrative:
      "NVIDIA 在数据中心 GPU 市场份额超过 80%，AMD 和 Intel 尚未形成有效竞争 [E2]。CUDA 生态的软件护城河是核心壁垒。",
    visual: {
      kind: "chart",
      title: "数据中心收入趋势",
      chartType: "bar",
      labels: ["FY2023", "FY2024", "FY2025", "FY2026"],
      series: [{ name: "数据中心收入 ($B)", values: [15, 47, 115, 115] }],
      source: "NVIDIA 季度财报",
      date: "2026-01-31",
    },
  },
  conclusion: {
    summary:
      "NVIDIA 在 AI 芯片领域的主导地位短期内难以撼动，但需关注客户自研芯片和 AMD 竞争带来的长期风险。",
    risks: [
      {
        risk: "大型客户自研 AI 芯片加速",
        explanation:
          "Google TPU、Amazon Trainium 等可能侵蚀 NVIDIA 数据中心份额 [E2]",
      },
      {
        risk: "出口管制进一步收紧",
        explanation: "对华出口限制可能影响约 10-15% 的数据中心收入 [E3]",
      },
    ],
    invalidationConditions: [
      {
        condition: "数据中心收入连续两季同比下降超过 10%",
        metric: "数据中心收入",
        threshold: "YoY -10%",
      },
      {
        condition: "CUDA 生态市场份额降至 60% 以下",
        metric: "GPU 市场份额",
        threshold: "60%",
      },
    ],
  },
  evidence: [
    {
      id: "E1",
      claim: "NVIDIA CUDA 生态形成软件护城河",
      source: "行业研究报告",
      date: "2026-06-01",
      url: "",
      confidence: "verified",
    },
    {
      id: "E2",
      claim: "大型客户自研芯片尚未形成规模替代",
      source: "Bloomberg",
      date: "2026-07-15",
      url: "https://bloomberg.com/example",
      confidence: "partial",
    },
    {
      id: "E3",
      claim: "FY2026 数据中心收入达 $115B",
      source: "NVIDIA 10-K",
      date: "2026-01-31",
      url: "",
      confidence: "verified",
    },
  ],
  generatedAt: "2026-08-10T16:00:00Z",
  language: "zh",
  disclaimer:
    "本报告仅供研究参考，不构成投资建议。所有数据请独立核实后再做决策。",
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("researchArticleSchema", () => {
  it("accepts a valid article", () => {
    const parsed = JSON.parse(VALID_ARTICLE_JSON) as Record<string, unknown>;
    const result = researchArticleSchema.safeParse(parsed);
    expect(result.success).toBe(true);
  });

  it("rejects missing schema_version", () => {
    const parsed = JSON.parse(VALID_ARTICLE_JSON) as Record<string, unknown>;
    delete parsed.schema_version;
    const result = researchArticleSchema.safeParse(parsed);
    expect(result.success).toBe(false);
  });

  it("rejects wrong schema_version", () => {
    const parsed = JSON.parse(VALID_ARTICLE_JSON) as Record<string, unknown>;
    parsed.schema_version = 2;
    const result = researchArticleSchema.safeParse(parsed);
    expect(result.success).toBe(false);
  });

  it("rejects empty thesis", () => {
    const parsed = JSON.parse(VALID_ARTICLE_JSON) as Record<string, unknown>;
    const thesis = parsed.coreThesis as Record<string, unknown>;
    thesis.thesis = "short";
    const result = researchArticleSchema.safeParse(parsed);
    expect(result.success).toBe(false);
  });

  it("rejects visual without source (non-empty)", () => {
    const parsed = JSON.parse(VALID_ARTICLE_JSON) as Record<string, unknown>;
    const chain = parsed.industryChain as Record<string, unknown>;
    const visual = chain.visual as Record<string, unknown>;
    delete visual.source;
    const result = researchArticleSchema.safeParse(parsed);
    expect(result.success).toBe(false);
  });

  it("rejects visual without date (non-empty)", () => {
    const parsed = JSON.parse(VALID_ARTICLE_JSON) as Record<string, unknown>;
    const matrix = parsed.evidenceMatrix as Record<string, unknown>;
    const visual = matrix.visual as Record<string, unknown>;
    delete visual.date;
    const result = researchArticleSchema.safeParse(parsed);
    expect(result.success).toBe(false);
  });

  it("accepts empty visual without source/date", () => {
    const parsed = JSON.parse(VALID_ARTICLE_JSON) as Record<string, unknown>;
    const layer = parsed.companyLayer as Record<string, unknown>;
    layer.visual = {
      kind: "empty",
      title: "数据不可用",
      reason: "无法获取可靠的收入趋势数据",
    };
    const result = researchArticleSchema.safeParse(parsed);
    expect(result.success).toBe(true);
  });

  it("rejects fewer than 3 evidence items", () => {
    const parsed = JSON.parse(VALID_ARTICLE_JSON) as Record<string, unknown>;
    parsed.evidence = [
      {
        id: "E1",
        claim: "test",
        source: "src",
        date: "2026-01-01",
        confidence: "verified",
      },
    ];
    const result = researchArticleSchema.safeParse(parsed);
    expect(result.success).toBe(false);
  });

  it("rejects fewer than 2 risks", () => {
    const parsed = JSON.parse(VALID_ARTICLE_JSON) as Record<string, unknown>;
    const conclusion = parsed.conclusion as Record<string, unknown>;
    conclusion.risks = [{ risk: "only one" }];
    const result = researchArticleSchema.safeParse(parsed);
    expect(result.success).toBe(false);
  });

  it("rejects fewer than 2 invalidation conditions", () => {
    const parsed = JSON.parse(VALID_ARTICLE_JSON) as Record<string, unknown>;
    const conclusion = parsed.conclusion as Record<string, unknown>;
    conclusion.invalidationConditions = [
      { condition: "only one condition here" },
    ];
    const result = researchArticleSchema.safeParse(parsed);
    expect(result.success).toBe(false);
  });

  it("rejects missing disclaimer", () => {
    const parsed = JSON.parse(VALID_ARTICLE_JSON) as Record<string, unknown>;
    delete parsed.disclaimer;
    const result = researchArticleSchema.safeParse(parsed);
    expect(result.success).toBe(false);
  });
});

describe("validateArticleOutput", () => {
  it("passes valid JSON output", () => {
    const result = validateArticleOutput(VALID_ARTICLE_JSON);
    expect(result.ok).toBe(true);
    expect(result.data?.schema_version).toBe(1);
  });

  it("rejects target price language", () => {
    const bad = VALID_ARTICLE_JSON.replace(
      "NVIDIA 在 AI 推理芯片市场的主导地位",
      "NVIDIA target price $200 based on",
    );
    const result = validateArticleOutput(bad);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("compliance redline");
  });

  it("rejects buy rating language", () => {
    const bad = VALID_ARTICLE_JSON.replace(
      "本报告仅供研究参考",
      "We issue a strong buy rating. 本报告仅供研究参考",
    );
    const result = validateArticleOutput(bad);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("compliance redline");
  });

  it("rejects invalid JSON", () => {
    const result = validateArticleOutput("not json at all");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("No JSON object");
  });

  it("rejects schema-invalid JSON", () => {
    const result = validateArticleOutput('{"schema_version": 99}');
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Schema validation failed");
  });

  it("handles JSON wrapped in markdown fences", () => {
    const wrapped = "```json\n" + VALID_ARTICLE_JSON + "\n```";
    const result = validateArticleOutput(wrapped);
    expect(result.ok).toBe(true);
  });
});
