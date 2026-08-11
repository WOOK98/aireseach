/**
 * AleaBit Financial Brief Card — Zod Schema (#119)
 *
 * Validates structured brief output. Key invariants:
 * - Every metric must have source (evidence ID), period, and unit
 * - Evidence items must have source, date, and unit
 * - No target prices, ratings, or buy/sell/hold language
 * - Original post is trigger only; financial data from SEC/IR
 */
import { z } from "zod";

// ── Sub-schemas ──────────────────────────────────────────────────────────────

const triggerPostSchema = z.object({
  postId: z.string().min(1),
  conversationId: z.string().min(1),
  author: z.string().min(1),
  authorHandle: z.string().min(1),
  text: z.string().min(1),
  postedAt: z.string().min(1),
  url: z.string().url(),
  editHistory: z.array(z.string()),
  fetchedAt: z.string().min(1),
});

const briefEvidenceSchema = z.object({
  id: z.string().min(1),
  claim: z.string().min(1),
  source: z.string().min(1),
  date: z.string().min(1),
  url: z.string().url().optional(),
  unit: z.string().optional(),
  fiscalPeriod: z.string().optional(),
  confidence: z.enum(["verified", "partial", "unverified"]),
});

const briefMetricSchema = z.object({
  name: z.string().min(1),
  value: z.number().nullable(),
  unit: z.string().min(1),
  period: z.string().min(1),
  yoyChange: z.number().nullable().optional(),
  qoqChange: z.number().nullable().optional(),
  source: z.string().min(1), // evidence ID
  isEstimate: z.boolean().optional(),
});

const guidanceChangeSchema = z.object({
  metric: z.string().min(1),
  previous: z.string().min(1),
  updated: z.string().min(1),
  direction: z.enum(["raised", "lowered", "maintained", "initiated"]),
  period: z.string().min(1),
  source: z.string().min(1), // evidence ID
});

const briefDriverSchema = z.object({
  description: z.string().min(10),
  evidenceIds: z.array(z.string().min(1)).min(1),
});

const briefRiskSchema = z.object({
  description: z.string().min(10),
  falsifier: z.string().optional(),
  evidenceIds: z.array(z.string().min(1)).min(1),
});

// ── Main schema ──────────────────────────────────────────────────────────────

export const financialBriefCardSchema = z
  .object({
    schema_version: z.literal(1),

    // Provenance
    triggerPost: triggerPostSchema,
    authorThesis: z.string().min(10),

    // Entity
    company: z.string().min(1),
    ticker: z.string().min(1),
    market: z.string().min(1),
    reportPeriod: z.string().min(1),
    publishedAt: z.string().min(1),

    // Data
    metrics: z.array(briefMetricSchema).min(1),
    guidanceChanges: z.array(guidanceChangeSchema),
    drivers: z.array(briefDriverSchema).min(1),
    risksOrFalsifiers: z.array(briefRiskSchema).min(1),
    supplyChainBottleneck: z.string().optional(),

    // Meta
    limitations: z.array(z.string()),
    sources: z.array(briefEvidenceSchema).min(1),
    disclaimer: z.string().min(10),
  })
  .superRefine((card, ctx) => {
    // Every metric.source must reference an existing evidence ID
    const evidenceIds = new Set(card.sources.map((s) => s.id));

    for (const metric of card.metrics) {
      if (!evidenceIds.has(metric.source)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Metric "${metric.name}" references unknown evidence ID "${metric.source}"`,
          path: ["metrics"],
        });
      }
    }

    // Every guidanceChange.source must reference an existing evidence ID
    for (const g of card.guidanceChanges) {
      if (!evidenceIds.has(g.source)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Guidance "${g.metric}" references unknown evidence ID "${g.source}"`,
          path: ["guidanceChanges"],
        });
      }
    }

    // Every driver/risk evidenceId must reference an existing evidence ID
    for (const d of card.drivers) {
      for (const eid of d.evidenceIds) {
        if (!evidenceIds.has(eid)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Driver references unknown evidence ID "${eid}"`,
            path: ["drivers"],
          });
        }
      }
    }

    for (const r of card.risksOrFalsifiers) {
      for (const eid of r.evidenceIds) {
        if (!evidenceIds.has(eid)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Risk references unknown evidence ID "${eid}"`,
            path: ["risksOrFalsifiers"],
          });
        }
      }
    }

    // Every evidence ID must be referenced by at least one metric, driver, or risk
    const referencedIds = new Set<string>();
    for (const m of card.metrics) referencedIds.add(m.source);
    for (const g of card.guidanceChanges) referencedIds.add(g.source);
    for (const d of card.drivers)
      d.evidenceIds.forEach((id) => referencedIds.add(id));
    for (const r of card.risksOrFalsifiers)
      r.evidenceIds.forEach((id) => referencedIds.add(id));

    for (const ev of card.sources) {
      if (!referencedIds.has(ev.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Evidence "${ev.id}" is never referenced by any metric, driver, or risk`,
          path: ["sources"],
        });
      }
    }
  });

// ── Compliance redline check ─────────────────────────────────────────────────

const PROHIBITED_BRIEF_PATTERN =
  /\b(target price|price target|buy rating|sell rating|strong buy|strong sell|buy-hold-sell|position sizing|portfolio weights?|entry levels?|stop levels?)\b/i;

export function validateBriefOutput(raw: string): {
  ok: boolean;
  data?: z.infer<typeof financialBriefCardSchema>;
  error?: string;
} {
  // Extract JSON from possible markdown fences
  const clean = raw.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return { ok: false, error: "No JSON object found in output." };
  }

  const jsonStr = clean.slice(start, end + 1);

  // Compliance redline
  if (PROHIBITED_BRIEF_PATTERN.test(jsonStr)) {
    return {
      ok: false,
      error:
        "Output crossed compliance redline (target price / rating language).",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return { ok: false, error: "Invalid JSON." };
  }

  const result = financialBriefCardSchema.safeParse(parsed);
  if (!result.success) {
    const msgs = result.error.issues.map((i) => i.message).join("; ");
    return { ok: false, error: `Schema validation failed: ${msgs}` };
  }

  return { ok: true, data: result.data };
}
