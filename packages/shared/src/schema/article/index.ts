/**
 * Research Article Generator MVP — Zod schema (#116)
 *
 * Validates LLM output. Fails = degrade gracefully, never output empty prose.
 */
import { z } from "zod";

// ── Visual schemas ───────────────────────────────────────────────────────────

const mermaidVisualSchema = z.object({
  kind: z.literal("mermaid"),
  title: z.string().min(1),
  diagram: z.string().min(10),
  source: z.string().optional(),
  date: z.string().optional(),
});

const matrixVisualSchema = z.object({
  kind: z.literal("matrix"),
  title: z.string().min(1),
  columns: z.array(z.string().min(1)).min(2),
  rows: z.array(z.record(z.string(), z.string())).min(1),
  source: z.string().optional(),
  date: z.string().optional(),
});

const chartVisualSchema = z.object({
  kind: z.literal("chart"),
  title: z.string().min(1),
  chartType: z.enum(["bar", "line", "area"]),
  labels: z.array(z.string()).min(2),
  series: z
    .array(
      z.object({
        name: z.string().min(1),
        values: z.array(z.number()),
        color: z.string().optional(),
      }),
    )
    .min(1),
  source: z.string().optional(),
  date: z.string().optional(),
});

const emptyVisualSchema = z.object({
  kind: z.literal("empty"),
  title: z.string().min(1),
  reason: z.string().min(1),
});

const articleVisualSchema = z.discriminatedUnion("kind", [
  mermaidVisualSchema,
  matrixVisualSchema,
  chartVisualSchema,
  emptyVisualSchema,
]);

// ── Evidence schema ──────────────────────────────────────────────────────────

const evidenceRefSchema = z.object({
  id: z.string().min(1),
  claim: z.string().min(1),
  source: z.string().min(1),
  date: z.string().min(1),
  url: z.string().url().optional().or(z.literal("")),
  confidence: z.enum(["verified", "partial", "unverified"]),
});

// ── Section schemas ──────────────────────────────────────────────────────────

const entityLockSchema = z.object({
  resolvedName: z.string().min(1),
  ticker: z.string().optional(),
  exchange: z.string().optional(),
  sector: z.string().optional(),
  industry: z.string().optional(),
  mode: z.enum(["ticker", "industry"]),
  dataTimestamp: z.string().min(1),
});

const coreThesisSchema = z.object({
  thesis: z.string().min(10),
  keyDriver: z.string().min(5),
  nonConsensus: z.string().optional(),
});

const industryChainSchema = z.object({
  narrative: z.string().min(20),
  visual: articleVisualSchema,
});

const evidenceMatrixSchema = z.object({
  narrative: z.string().min(20),
  visual: articleVisualSchema,
});

const companyLayerSchema = z.object({
  narrative: z.string().min(20),
  visual: articleVisualSchema.optional(),
});

const riskSchema = z.object({
  risk: z.string().min(3),
  explanation: z.string().optional(),
});

const invalidationSchema = z.object({
  condition: z.string().min(5),
  metric: z.string().optional(),
  threshold: z.string().optional(),
});

const conclusionSchema = z.object({
  summary: z.string().min(20),
  risks: z.array(riskSchema).min(2).max(6),
  invalidationConditions: z.array(invalidationSchema).min(2).max(4),
});

// ── Full article schema ──────────────────────────────────────────────────────

export const researchArticleSchema = z.object({
  schema_version: z.literal(1),

  entity: entityLockSchema,
  coreThesis: coreThesisSchema,
  industryChain: industryChainSchema,
  evidenceMatrix: evidenceMatrixSchema,
  companyLayer: companyLayerSchema,
  conclusion: conclusionSchema,

  evidence: z.array(evidenceRefSchema).min(3),

  generatedAt: z.string(),
  language: z.enum(["zh", "en"]),
  model: z.string().optional(),
  disclaimer: z.string().min(1),
});

export type ValidatedArticle = z.infer<typeof researchArticleSchema>;

// ── Compliance check ─────────────────────────────────────────────────────────

const PROHIBITED_ARTICLE_PATTERN =
  /\b(target price|price target|buy rating|sell rating|strong buy|strong sell|buy-hold-sell|position sizing|portfolio weights?|entry levels?|stop levels?)\b/i;

export function validateArticleOutput(text: string): {
  ok: boolean;
  data?: ValidatedArticle;
  error?: string;
} {
  // Compliance redline check
  if (PROHIBITED_ARTICLE_PATTERN.test(text)) {
    return {
      ok: false,
      error:
        "Output crossed compliance redline (target price / rating language).",
    };
  }

  // Parse JSON
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return { ok: false, error: "No JSON object found in model output." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(clean.slice(start, end + 1));
  } catch {
    return { ok: false, error: "Invalid JSON in model output." };
  }

  const result = researchArticleSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: `Schema validation failed: ${result.error.message}`,
    };
  }

  return { ok: true, data: result.data };
}
