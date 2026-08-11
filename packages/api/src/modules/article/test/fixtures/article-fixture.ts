/**
 * Shared fixture: valid Research Article JSON for test mocking.
 */
export const VALID_ARTICLE = {
  schema_version: 1,
  entity: {
    resolvedName: "NVIDIA Corporation",
    ticker: "NVDA",
    exchange: "NASDAQ",
    sector: "Technology",
    industry: "Semiconductors",
    mode: "ticker",
    dataTimestamp: new Date().toISOString().split("T")[0],
  },
  coreThesis: {
    thesis:
      "NVIDIA 在 AI 推理芯片市场的主导地位将持续扩大，数据中心收入占比已超过 80%。",
    keyDriver: "Hopper/Blackwell 架构在大模型训练中的不可替代性",
    nonConsensus: "市场低估了推理侧对 GPU 的长期需求",
    evidenceIds: ["E1", "E2"],
  },
  industryChain: {
    narrative:
      "AI 芯片产业链从上游设备材料到下游应用形成完整链条。NVIDIA 处于中游核心位置。",
    visual: {
      kind: "mermaid",
      title: "AI 芯片产业链",
      diagram: "graph LR\n  A[晶圆代工] --> B[芯片设计]\n  B --> C[服务器整机]",
      source: "公开产业链研究",
      date: "2026-06-01",
      evidenceIds: ["E1"],
    },
    evidenceIds: ["E1"],
  },
  evidenceMatrix: {
    narrative: "关键财务指标显示 NVIDIA 收入和利润持续高增长。",
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
      ],
      source: "NVIDIA 10-K FY2026",
      date: "2026-01-31",
      evidenceIds: ["E3"],
    },
    evidenceIds: ["E3"],
  },
  companyLayer: {
    narrative: "NVIDIA 在数据中心 GPU 市场份额超过 80%，CUDA 生态是核心壁垒。",
    visual: {
      kind: "empty",
      title: "数据不可用",
      reason: "无法获取可靠的市场份额趋势数据",
    },
    evidenceIds: ["E3"],
  },
  conclusion: {
    summary: "NVIDIA 在 AI 芯片领域的主导地位短期内难以撼动。",
    risks: [
      {
        risk: "大型客户自研 AI 芯片加速",
        explanation: "Google TPU、Amazon Trainium 等可能侵蚀份额",
        evidenceIds: ["E2"],
      },
      {
        risk: "出口管制进一步收紧",
        explanation: "对华出口限制可能影响收入",
        evidenceIds: ["E3"],
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
    evidenceIds: ["E1", "E2", "E3"],
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
  generatedAt: new Date().toISOString(),
  language: "zh",
  disclaimer: "本报告仅供研究参考，不构成投资建议。",
};
