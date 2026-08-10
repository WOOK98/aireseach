/**
 * Research Article Generator MVP — Type definitions (#116)
 *
 * Fixed 8-section structure. v1 template locked.
 * Visual priority: Mermaid → candidate matrix → real API time series → honest empty state.
 * source/date REQUIRED on all non-empty visuals.
 * evidenceIds REQUIRED on all sections — schema-enforced linkage.
 */

// ── Visual definitions ───────────────────────────────────────────────────────

export interface MermaidVisual {
  kind: "mermaid";
  title: string;
  diagram: string;
  source: string;
  date: string;
  evidenceIds: string[];
}

export interface MatrixVisual {
  kind: "matrix";
  title: string;
  columns: string[];
  rows: Array<Record<string, string>>;
  source: string;
  date: string;
  evidenceIds: string[];
}

export interface ChartVisual {
  kind: "chart";
  title: string;
  chartType: "bar" | "line" | "area";
  labels: string[];
  series: Array<{
    name: string;
    values: number[];
    color?: string;
  }>;
  source: string;
  date: string;
  evidenceIds: string[];
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

// ── Article sections (with evidenceIds) ──────────────────────────────────────

export interface ArticleEntityLock {
  resolvedName: string;
  ticker?: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  mode: "ticker" | "industry";
  dataTimestamp: string;
}

export interface ArticleCoreThesis {
  thesis: string;
  keyDriver: string;
  nonConsensus?: string;
  evidenceIds: string[];
}

export interface ArticleIndustryChain {
  narrative: string;
  visual: ArticleVisual;
  evidenceIds: string[];
}

export interface ArticleEvidenceMatrix {
  narrative: string;
  visual: ArticleVisual;
  evidenceIds: string[];
}

export interface ArticleCompanyLayer {
  narrative: string;
  visual?: ArticleVisual;
  evidenceIds: string[];
}

export interface ArticleRisk {
  risk: string;
  explanation?: string;
  evidenceIds: string[];
}

export interface ArticleInvalidation {
  condition: string;
  metric?: string;
  threshold?: string;
}

export interface ArticleConclusion {
  summary: string;
  risks: ArticleRisk[];
  invalidationConditions: ArticleInvalidation[];
  evidenceIds: string[];
}

// ── Full article ─────────────────────────────────────────────────────────────

export interface ResearchArticle {
  schema_version: 1;

  entity: ArticleEntityLock;
  coreThesis: ArticleCoreThesis;
  industryChain: ArticleIndustryChain;
  evidenceMatrix: ArticleEvidenceMatrix;
  companyLayer: ArticleCompanyLayer;
  conclusion: ArticleConclusion;

  evidence: EvidenceRef[];

  generatedAt: string;
  language: "zh" | "en";
  disclaimer: string;
}
