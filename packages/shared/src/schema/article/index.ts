/**
 * Research Article Generator MVP — Zod schema (#116)
 *
 * Validates LLM output. Fails = degrade gracefully, never output empty prose.
 * source/date REQUIRED on all non-empty visuals.
 * Evidence IDs required on key claims — enforced by superRefine.
 * Unreferenced evidence IDs flagged as warnings.
 */
import { z } from "zod";

// ── Visual schemas ───────────────────────────────────────────────────────────

const mermaidVisualSchema = z.object({
  kind: z.literal("mermaid"),
  title: z.string().min(1),
  diagram: z.string().min(10),
  source: z.string().min(1),
  date: z.string().min(1),
  evidenceIds: z.array(z.string().min(1)).min(1),
});

const matrixVisualSchema = z.object({
  kind: z.literal("matrix"),
  title: z.string().min(1),
  columns: z.array(z.string().min(1)).min(2),
  rows: z.array(z.record(z.string(), z.string())).min(1),
  source: z.string().min(1),
  date: z.string().min(1),
  evidenceIds: z.array(z.string().min(1)).min(1),
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
  source: z.string().min(1),
  date: z.string().min(1),
  evidenceIds: z.array(z.string().min(1)).min(1),
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

// ── Section schemas (with evidenceIds) ───────────────────────────────────────

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
  evidenceIds: z.array(z.string().min(1)).min(1),
});

const industryChainSchema = z.object({
  narrative: z.string().min(20),
  visual: articleVisualSchema,
  evidenceIds: z.array(z.string().min(1)).min(1),
});

const evidenceMatrixSchema = z.object({
  narrative: z.string().min(20),
  visual: articleVisualSchema,
  evidenceIds: z.array(z.string().min(1)).min(1),
});

const companyLayerSchema = z.object({
  narrative: z.string().min(20),
  visual: articleVisualSchema.optional(),
  evidenceIds: z.array(z.string().min(1)).min(1),
});

const riskSchema = z.object({
  risk: z.string().min(3),
  explanation: z.string().optional(),
  evidenceIds: z.array(z.string().min(1)).min(1),
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
  evidenceIds: z.array(z.string().min(1)).min(1),
});

// ── Base schema (before refine) ──────────────────────────────────────────────

const baseArticleSchema = z.object({
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
  disclaimer: z.string().min(1),
});

// ── Evidence linkage enforcement via superRefine ─────────────────────────────

/**
 * Collect all evidenceIds referenced across the article.
 * Returns a flat array of [path, id] tuples for error reporting.
 */
function collectEvidenceRefs(data: z.infer<typeof baseArticleSchema>): {
  path: string;
  id: string;
}[] {
  const refs: { path: string; id: string }[] = [];

  // coreThesis
  for (const id of data.coreThesis.evidenceIds) {
    refs.push({ path: "coreThesis.evidenceIds", id });
  }

  // industryChain
  for (const id of data.industryChain.evidenceIds) {
    refs.push({ path: "industryChain.evidenceIds", id });
  }
  if (
    data.industryChain.visual.kind !== "empty" &&
    "evidenceIds" in data.industryChain.visual
  ) {
    for (const id of data.industryChain.visual.evidenceIds) {
      refs.push({ path: "industryChain.visual.evidenceIds", id });
    }
  }

  // evidenceMatrix
  for (const id of data.evidenceMatrix.evidenceIds) {
    refs.push({ path: "evidenceMatrix.evidenceIds", id });
  }
  if (
    data.evidenceMatrix.visual.kind !== "empty" &&
    "evidenceIds" in data.evidenceMatrix.visual
  ) {
    for (const id of data.evidenceMatrix.visual.evidenceIds) {
      refs.push({ path: "evidenceMatrix.visual.evidenceIds", id });
    }
  }

  // companyLayer
  for (const id of data.companyLayer.evidenceIds) {
    refs.push({ path: "companyLayer.evidenceIds", id });
  }
  if (
    data.companyLayer.visual &&
    data.companyLayer.visual.kind !== "empty" &&
    "evidenceIds" in data.companyLayer.visual
  ) {
    for (const id of data.companyLayer.visual.evidenceIds) {
      refs.push({ path: "companyLayer.visual.evidenceIds", id });
    }
  }

  // conclusion
  for (const id of data.conclusion.evidenceIds) {
    refs.push({ path: "conclusion.evidenceIds", id });
  }
  for (let i = 0; i < data.conclusion.risks.length; i++) {
    const risk = data.conclusion.risks[i];
    if (!risk) continue;
    for (const id of risk.evidenceIds) {
      refs.push({ path: `conclusion.risks[${i}].evidenceIds`, id });
    }
  }

  return refs;
}

export const researchArticleSchema = baseArticleSchema.superRefine(
  (data, ctx) => {
    const declaredIds = new Set(data.evidence.map((e) => e.id));
    const refs = collectEvidenceRefs(data);

    // Check: every referenced evidenceId must exist in evidence[]
    for (const { path, id } of refs) {
      if (!declaredIds.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `evidenceId "${id}" not found in evidence[]. Declared IDs: [${[...declaredIds].join(", ")}]`,
          path: path.split("."),
        });
      }
    }

    // Check: every evidence item must be referenced at least once
    const referencedIds = new Set(refs.map((r) => r.id));
    for (const ev of data.evidence) {
      if (!referencedIds.has(ev.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Evidence "${ev.id}" is declared but never referenced by any section.`,
          path: ["evidence"],
        });
      }
    }
  },
);

export type ValidatedArticle = z.infer<typeof researchArticleSchema>;

// ── Compliance check ─────────────────────────────────────────────────────────

const PROHIBITED_ARTICLE_PATTERN =
  /\b(target price|price target|buy rating|sell rating|strong buy|strong sell|buy-hold-sell|position sizing|portfolio weights?|entry levels?|stop levels?)\b/i;

export function validateArticleOutput(text: string): {
  ok: boolean;
  data?: ValidatedArticle;
  error?: string;
} {
  if (PROHIBITED_ARTICLE_PATTERN.test(text)) {
    return {
      ok: false,
      error:
        "Output crossed compliance redline (target price / rating language).",
    };
  }

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
