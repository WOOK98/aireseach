/**
 * AleaBit — Fixture evidence & brief data (#121)
 *
 * Pre-built filing-grade evidence and metrics for replay fixtures.
 * Used by shadow-run runner to demonstrate a real end-to-end path
 * through the evidence gate → brief generation → renderer.
 *
 * These fixtures simulate SEC/IR-sourced data. In production,
 * this data would come from SEC EDGAR / Company IR APIs.
 */
import type {
  BriefEvidence,
  BriefMetric,
  GuidanceChange,
  BriefDriver,
  BriefRisk,
  FinancialBriefCard,
  TriggerPost,
} from "@workspace/shared/types/aleabit";

// ── NVDA earnings fixture evidence ───────────────────────────────────────────

export const NVDA_EVIDENCE: BriefEvidence[] = [
  {
    id: "E1",
    claim: "Q2 FY2026 revenue $30.0B",
    source: "SEC 10-Q",
    date: "2026-08-10",
    url: "https://www.sec.gov/edgar/searchedgar/companysearch",
    unit: "USD",
    fiscalPeriod: "FY2026 Q2",
    confidence: "verified",
  },
  {
    id: "E2",
    claim: "Q2 FY2026 gross margin 75.1%",
    source: "SEC 10-Q",
    date: "2026-08-10",
    url: "https://www.sec.gov/edgar/searchedgar/companysearch",
    unit: "%",
    fiscalPeriod: "FY2026 Q2",
    confidence: "verified",
  },
  {
    id: "E3",
    claim: "Q2 FY2026 EPS $0.68",
    source: "SEC 10-Q",
    date: "2026-08-10",
    url: "https://www.sec.gov/edgar/searchedgar/companysearch",
    unit: "USD",
    fiscalPeriod: "FY2026 Q2",
    confidence: "verified",
  },
  {
    id: "E4",
    claim: "Data Center revenue $26.3B",
    source: "Earnings Release",
    date: "2026-08-10",
    unit: "USD",
    fiscalPeriod: "FY2026 Q2",
    confidence: "verified",
  },
  {
    id: "E5",
    claim: "Author thesis on AI infrastructure buildout",
    source: "author_claim",
    date: "2026-08-10",
    confidence: "unverified",
  },
];

export const NVDA_METRICS: BriefMetric[] = [
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
    yoyChange: 2.1,
    source: "E2",
  },
  {
    name: "EPS",
    value: 0.68,
    unit: "USD",
    period: "FY2026 Q2",
    yoyChange: 42,
    source: "E3",
  },
  {
    name: "Data Center Revenue",
    value: 26_300_000_000,
    unit: "USD",
    period: "FY2026 Q2",
    yoyChange: 62,
    source: "E4",
  },
];

export const NVDA_GUIDANCE: GuidanceChange[] = [
  {
    metric: "Revenue",
    previous: "$115B",
    updated: "$125B",
    direction: "raised",
    period: "FY2026",
    source: "E1",
  },
];

export const NVDA_DRIVERS: BriefDriver[] = [
  {
    description: "Blackwell GPU shipments doubled quarter-over-quarter.",
    evidenceIds: ["E1", "E4"],
  },
  {
    description: "Hyperscaler capex continues to accelerate.",
    evidenceIds: ["E4"],
  },
  {
    description: "Inference demand now exceeding training demand.",
    evidenceIds: ["E5"],
  },
];

export const NVDA_RISKS: BriefRisk[] = [
  {
    description: "China export restrictions tightening further.",
    falsifier: "US-China trade deal easing semiconductor restrictions.",
    evidenceIds: ["E5"],
  },
  {
    description: "Custom silicon from hyperscalers gaining traction.",
    falsifier: "Google TPU / Amazon Trainium revenue exceeding $5B annually.",
    evidenceIds: ["E5"],
  },
];

// ── Build brief card from fixture data ───────────────────────────────────────

export function buildNVDABrief(rootPost: TriggerPost): FinancialBriefCard {
  return {
    schema_version: 1,
    triggerPost: rootPost,
    authorThesis:
      "AI infrastructure buildout accelerating. Blackwell ramp is the key catalyst for continued growth.",
    company: "NVIDIA Corporation",
    ticker: "NVDA",
    market: "US",
    reportPeriod: "FY2026 Q2",
    publishedAt: new Date().toISOString(),
    metrics: NVDA_METRICS,
    guidanceChanges: NVDA_GUIDANCE,
    drivers: NVDA_DRIVERS,
    risksOrFalsifiers: NVDA_RISKS,
    supplyChainBottleneck:
      "SK Hynix HBM3E lead times extended to 52+ weeks. TSMC CoWoS packaging capacity fully booked through 2027.",
    limitations: [
      "Segment-level breakdown beyond Data Center not yet available from SEC filing.",
      "Forward guidance is management estimate, not audited.",
    ],
    sources: NVDA_EVIDENCE,
    disclaimer:
      "本简报基于公开财报与社交媒体内容自动生成，仅供参考，不构成投资建议。所有数据请独立核实。",
  };
}
