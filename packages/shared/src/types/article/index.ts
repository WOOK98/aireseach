/**
 * Research Article Generator MVP — Type definitions (#116)
 *
 * Fixed 8-section structure. v1 template locked.
 * Visual priority: Mermaid → candidate matrix → real API time series → honest empty state.
 */

// ── Visual definitions ───────────────────────────────────────────────────────

export interface MermaidVisual {
  kind: "mermaid";
  title: string;
  /** Mermaid diagram definition (flowchart, graph, etc.) */
  diagram: string;
  /** Source attribution for the diagram data */
  source?: string;
  date?: string;
}

export interface MatrixVisual {
  kind: "matrix";
  title: string;
  columns: string[];
  rows: Array<Record<string, string>>;
  source?: string;
  date?: string;
}

export interface ChartVisual {
  kind: "chart";
  title: string;
  /** Chart type hint for the renderer */
  chartType: "bar" | "line" | "area";
  /** x-axis labels */
  labels: string[];
  /** Data series */
  series: Array<{
    name: string;
    values: number[];
    color?: string;
  }>;
  source?: string;
  date?: string;
}

export interface EmptyVisual {
  kind: "empty";
  title: string;
  reason: string;
}

export type ArticleVisual =
  | MermaidVisual
  | MatrixVisual
  | ChartVisual
  | EmptyVisual;

// ── Evidence ─────────────────────────────────────────────────────────────────

export interface EvidenceRef {
  id: string;
  claim: string;
  source: string;
  date: string;
  url?: string;
  confidence: "verified" | "partial" | "unverified";
}

// ── Article sections ─────────────────────────────────────────────────────────

export interface ArticleEntityLock {
  resolvedName: string;
  ticker?: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  /** "Industry Mode" for theme/industry queries */
  mode: "ticker" | "industry";
  dataTimestamp: string;
}

export interface ArticleCoreThesis {
  /** One-sentence directional view */
  thesis: string;
  /** Single most important driver */
  keyDriver: string;
  /** What the market is missing (optional) */
  nonConsensus?: string;
}

export interface ArticleIndustryChain {
  narrative: string;
  visual: ArticleVisual;
}

export interface ArticleEvidenceMatrix {
  narrative: string;
  visual: ArticleVisual;
}

export interface ArticleCompanyLayer {
  narrative: string;
  /** Optional visual for company-level data */
  visual?: ArticleVisual;
}

export interface ArticleRisk {
  risk: string;
  /** Brief explanation */
  explanation?: string;
}

export interface ArticleInvalidation {
  condition: string;
  /** Observable metric */
  metric?: string;
  /** Numeric threshold */
  threshold?: string;
}

export interface ArticleConclusion {
  summary: string;
  risks: ArticleRisk[];
  invalidationConditions: ArticleInvalidation[];
}

// ── Full article ─────────────────────────────────────────────────────────────

export interface ResearchArticle {
  /** Schema version for forward compat */
  schema_version: 1;

  entity: ArticleEntityLock;
  coreThesis: ArticleCoreThesis;
  industryChain: ArticleIndustryChain;
  evidenceMatrix: ArticleEvidenceMatrix;
  companyLayer: ArticleCompanyLayer;
  conclusion: ArticleConclusion;

  /** Aggregated evidence spine */
  evidence: EvidenceRef[];

  /** Metadata */
  generatedAt: string;
  language: "zh" | "en";
  model?: string;
  disclaimer: string;
}
