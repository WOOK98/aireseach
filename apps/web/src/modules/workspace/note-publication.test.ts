/**
 * Note Publication — composer tests (#190)
 *
 * Covers the issue's verification checklist:
 * - doc_blocks serialization (paragraph, heading, checklist, quote, callout)
 * - placeholder blocks excluded from publish output
 * - article snapshot with evidence metadata (source / date / period / confidence)
 * - live blocks carry explicit stale / verification states and are labeled live
 * - draft note with source metadata and rawText
 * - empty/draft notes show honest empty preview states
 * - compliance pattern blocks the whole export
 * - HTML output is escaped
 * - forbidden advisory language not introduced by templates
 */
import { describe, expect, it } from "vitest";

import {
  composeNotePublication,
  renderHtml,
  renderMarkdown,
  type NotePublicationInput,
} from "./note-publication";

import type { DraftNoteArtifact } from "@workspace/shared/schema/article";
import type { LiveBlock } from "@workspace/shared/schema/live-block";
import type { NoteBlock } from "@workspace/shared/schema/note-block";
import type { ResearchArticle } from "@workspace/shared/types/article";

const EXPORTED_AT = "2026-08-31T08:46:00.000Z";

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

const DOC_BLOCKS: NoteBlock[] = [
  { id: "b1", type: "heading", text: "投资逻辑", level: 1 },
  { id: "b2", type: "paragraph", text: "推理需求是主线。" },
  {
    id: "b3",
    type: "checklist",
    text: "跟踪 Q3 收入",
    checked: true,
  },
  { id: "b4", type: "checklist", text: "确认 HBM 供给", checked: false },
  { id: "b5", type: "quote", text: "管理层信心很强。" },
  { id: "b6", type: "callout", text: "重点关注 HBM 供给瓶颈。" },
  { id: "b7", type: "evidence_placeholder", text: "待插证据" },
  { id: "b8", type: "live_placeholder", text: "" },
];

function articleNote(
  overrides: Partial<NotePublicationInput> = {},
): NotePublicationInput {
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
    blocks: DOC_BLOCKS,
    ...overrides,
  };
}

// ── Renderers ──────────────────────────────────────────────────────────────

describe("renderMarkdown", () => {
  it("renders headings with correct level prefix", () => {
    const md = renderMarkdown([{ kind: "heading", level: 2, text: "测试" }]);
    expect(md).toBe("## 测试");
  });

  it("renders checklist items", () => {
    const md = renderMarkdown([
      {
        kind: "tasks",
        items: [
          { text: "已完成", checked: true },
          { text: "待办", checked: false },
        ],
      },
    ]);
    expect(md).toContain("- [x] 已完成");
    expect(md).toContain("- [ ] 待办");
  });

  it("renders tables with pipe escaping", () => {
    const md = renderMarkdown([
      {
        kind: "table",
        columns: ["A", "B"],
        rows: [["值1 | pipe", "值2"]],
      },
    ]);
    expect(md).toContain("值1 \\| pipe");
  });
});

describe("renderHtml", () => {
  it("escapes HTML entities in text", () => {
    const html = renderHtml([
      { kind: "paragraph", text: '<script>alert("xss")</script>' },
    ]);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;");
  });

  it("renders tables with th and td", () => {
    const html = renderHtml([
      {
        kind: "table",
        columns: ["信号", "强度"],
        rows: [["资本开支", "强"]],
      },
    ]);
    expect(html).toContain("<th>信号</th>");
    expect(html).toContain("<td>资本开支</td>");
  });

  it("renders tasks as checkbox list", () => {
    const html = renderHtml([
      {
        kind: "tasks",
        items: [{ text: "跟踪", checked: true }],
      },
    ]);
    expect(html).toContain("☑");
    expect(html).toContain("跟踪");
  });
});

// ── Composer integration ──────────────────────────────────────────────────

describe("composeNotePublication — article note", () => {
  it("includes doc blocks in 正文 section", () => {
    const result = composeNotePublication(articleNote(), EXPORTED_AT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.markdown).toContain("## 正文");
    expect(result.markdown).toContain("### 投资逻辑");
    expect(result.markdown).toContain("推理需求是主线。");
    expect(result.markdown).toContain("- [x] 跟踪 Q3 收入");
    expect(result.markdown).toContain("- [ ] 确认 HBM 供给");
    expect(result.markdown).toContain("管理层信心很强。");
    expect(result.markdown).toContain("**提示：** 重点关注 HBM 供给瓶颈。");
  });

  it("excludes placeholder blocks from output", () => {
    const result = composeNotePublication(articleNote(), EXPORTED_AT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.markdown).not.toContain("待插证据");
    expect(result.markdown).not.toContain("evidence_placeholder");
    expect(result.markdown).not.toContain("live_placeholder");
  });

  it("includes article snapshot sections", () => {
    const result = composeNotePublication(articleNote(), EXPORTED_AT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.markdown).toContain("附录 A · 研究快照");
    expect(result.markdown).toContain("## 核心论点");
    expect(result.markdown).toContain("## 产业链");
    expect(result.markdown).toContain("```mermaid");
    expect(result.markdown).toContain("## 证据矩阵");
    expect(result.markdown).toContain("| 信号 | 强度 |");
    expect(result.markdown).toContain("## 结论");
    expect(result.markdown).toContain("### 失效条件");
    expect(result.markdown).toContain("指标：环比增速 · 阈值：< 0%");
  });

  it("preserves evidence metadata in appendix", () => {
    const result = composeNotePublication(articleNote(), EXPORTED_AT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.markdown).toContain("附录 B · 证据清单");
    expect(result.markdown).toContain("[E1]");
    expect(result.markdown).toContain("NVIDIA 10-Q");
    expect(result.markdown).toContain("2026-07-31");
    expect(result.markdown).toContain("已核实");
  });

  it("preserves live blocks with stale state and live label", () => {
    const result = composeNotePublication(articleNote(), EXPORTED_AT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.markdown).toContain(
      "附录 C · Live 证据块（实时数据，导出时刻快照）",
    );
    expect(result.markdown).toContain("FY2026 收入");
    expect(result.markdown).toContain("状态：待刷新");
    expect(result.markdown).toContain("来源：NVIDIA 10-K · 2026-01-31");
    expect(result.markdown).toContain("状态：刷新失败");
    expect(result.markdown).toContain("Source could not be reached");
  });

  it("sanitizes unsafe refreshError text out of Markdown and HTML output", () => {
    const dirtyErrors = [
      "fetch failed: process.env.MORNING_BRIEF_LLM_KEY missing",
      "EACCES /Users/wook/.config/aireseach/secrets.json",
      "OpenAI DeepSeek API rate limit exceeded",
      "invalid api token / secret key for provider",
      "Error at refreshBlock (apps/web/src/server/refresh.ts:142:11)",
    ];
    for (const refreshError of dirtyErrors) {
      const dirtyBlock: LiveBlock = { ...FAILED_BLOCK, refreshError };
      const result = composeNotePublication(
        articleNote({ liveBlocks: [dirtyBlock] }),
        EXPORTED_AT,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // Unsafe internals must not leak into either output format
      expect(result.markdown).not.toContain(refreshError);
      expect(result.html).not.toContain(refreshError);
      expect(result.markdown).not.toMatch(/process\.env/);
      expect(result.html).not.toMatch(/process\.env/);
      expect(result.markdown).not.toContain("MORNING_BRIEF_LLM_KEY");
      expect(result.html).not.toContain("/Users/wook");
      expect(result.markdown).not.toMatch(/OpenAI|DeepSeek/i);
      expect(result.html).not.toMatch(/OpenAI|DeepSeek/i);
      expect(result.markdown).not.toMatch(/token|secret/i);
      expect(result.html).not.toMatch(/refresh\.ts/);
      // Failed state stays honest + a failure reason row is still present
      expect(result.markdown).toContain("状态：刷新失败");
      expect(result.markdown).toContain("刷新失败原因：");
      expect(result.markdown).toContain(
        "Source could not be reached. Showing last saved content.",
      );
    }
  });

  it("still renders safe neutral refreshError messages verbatim", () => {
    const result = composeNotePublication(articleNote(), EXPORTED_AT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.markdown).toContain(
      "刷新失败原因：Source could not be reached. Showing last saved content.",
    );
    expect(result.html).toContain(
      "Source could not be reached. Showing last saved content.",
    );
  });

  it("renders a neutral failure label when refreshError is missing", () => {
    const bare: LiveBlock = { ...FAILED_BLOCK };
    delete bare.refreshError;
    const result = composeNotePublication(
      articleNote({ liveBlocks: [bare] }),
      EXPORTED_AT,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.markdown).toContain("状态：刷新失败");
    expect(result.markdown).toContain(
      "刷新失败原因：Source could not be reached. Showing last saved content.",
    );
  });

  it("includes metadata header and audit notice", () => {
    const result = composeNotePublication(articleNote(), EXPORTED_AT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.markdown).toContain("人工审阅后再发布");
    expect(result.markdown).toContain("快照时间：2026-08-20");
    expect(result.markdown).toContain("实体：NVIDIA（NVDA）");
    expect(result.markdown).toContain("标签：半导体、AI");
    expect(result.markdown).toContain("导出于 2026-08-31T08:46:00.000Z");
    expect(result.markdown).toContain(ARTICLE.disclaimer);
  });

  it("produces valid HTML output", () => {
    const result = composeNotePublication(articleNote(), EXPORTED_AT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.html).toContain("<h1>");
    expect(result.html).toContain("NVDA 推理拐点跟踪");
    expect(result.html).toContain("<h2>");
    expect(result.html).toContain("投资逻辑");
    expect(result.html).toContain("NVIDIA 10-Q");
    expect(result.html).not.toContain("<script>");
  });

  it("chart with missing value renders N/A, not 0", () => {
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
    const result = composeNotePublication(
      articleNote({ artifact: article }),
      EXPORTED_AT,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.markdown).toContain("N/A");
    expect(result.markdown).not.toContain("| 0 |");
  });

  it("missing optional metadata renders N/A, not empty", () => {
    const sparse = articleNote({
      entityTicker: null,
      entityName: null,
      summary: null,
      note: null,
      tags: [],
    });
    const result = composeNotePublication(sparse, EXPORTED_AT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.markdown).toContain("实体：N/A");
    expect(result.markdown).not.toContain("标签：");
  });
});

describe("composeNotePublication — draft note", () => {
  it("includes draft source metadata and rawText", () => {
    const draftBlocks: NoteBlock[] = [
      { id: "b1", type: "paragraph", text: "这是用户写的批注。" },
    ];
    const result = composeNotePublication(
      articleNote({
        kind: "draft",
        artifact: DRAFT,
        blocks: draftBlocks,
        liveBlocks: [],
      }),
      EXPORTED_AT,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.markdown).toContain("附录 A · 来源快照（不可变）");
    expect(result.markdown).toContain("供应链新闻");
    expect(result.markdown).toContain("记者甲");
    expect(result.markdown).toContain("原文第一段。");
    expect(result.markdown).toContain("这是用户写的批注。");
    expect(result.markdown).not.toContain("本内容由 AI 生成");
  });
});

describe("composeNotePublication — empty note", () => {
  it("empty doc blocks show honest empty state", () => {
    const result = composeNotePublication(
      articleNote({
        blocks: [{ id: "b1", type: "evidence_placeholder", text: "占位" }],
      }),
      EXPORTED_AT,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.markdown).toContain(
      "正文为空 — 文档画布中还没有可发布的内容。",
    );
  });

  it("article note with no live blocks shows empty state", () => {
    const result = composeNotePublication(
      articleNote({ liveBlocks: [] }),
      EXPORTED_AT,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.markdown).toContain("暂无 Live 证据块");
  });
});

describe("composeNotePublication — compliance", () => {
  it("blocks export when prohibited language is present", () => {
    const blocks: NoteBlock[] = [
      {
        id: "b1",
        type: "paragraph",
        text: "This stock has a target price of $200.",
      },
    ];
    const result = composeNotePublication(articleNote({ blocks }), EXPORTED_AT);
    expect(result.ok).toBe(false);
  });
});

describe("composeNotePublication — redline", () => {
  it("templates do not introduce prohibited advisory language", () => {
    const result = composeNotePublication(articleNote(), EXPORTED_AT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Verify no prohibited patterns sneak in via templates
    const pattern =
      /\b(target price|price target|buy rating|sell rating|strong buy|strong sell|buy-hold-sell|position sizing|portfolio weights?|entry levels?|stop levels?)\b/i;
    expect(pattern.test(result.markdown)).toBe(false);
  });
});
