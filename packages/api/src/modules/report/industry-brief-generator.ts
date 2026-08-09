// ─── Industry Brief Generator ─────────────────────────────────────────────────
// Best-effort: generates a structured Industry Research Brief from universe data.
// Failure = returns null (caller omits brief from response, universe table still works).

import { generateText } from "ai";

import {
  IndustryBriefSchema,
  INDUSTRY_BRIEF_METHODOLOGY,
  INDUSTRY_BRIEF_JSON_INSTRUCTIONS,
} from "@workspace/shared/industry-brief";

import type { IndustryUniverse } from "./industry";
import type { IndustryBriefValidated } from "@workspace/shared/industry-brief";
import type { LanguageModel } from "ai";

/**
 * System prompt assembled from the shared contract.
 * Single source of truth: packages/shared/src/industry-brief/contract.ts
 */
const BRIEF_SYSTEM_PROMPT = [
  "You are a senior industry research analyst producing an Industry Research Brief.",
  "",
  INDUSTRY_BRIEF_METHODOLOGY,
  "",
  INDUSTRY_BRIEF_JSON_INSTRUCTIONS,
].join("\n");

function buildBriefUserPrompt(
  query: string,
  universe: IndustryUniverse,
): string {
  const etfLines = universe.etfs
    .map((e) => `  - ${e.symbol} — ${e.name} (${e.holdings} holdings)`)
    .join("\n");

  const constituentLines = universe.constituents
    .map(
      (c) =>
        `  ${c.symbol.padEnd(12)} ${c.name} (avg weight: ${c.avgWeightPct}%, held by ${c.heldByEtfs} ETFs, source: ${c.source})`,
    )
    .join("\n");

  return `Generate an Industry Research Brief for: "${query}"

VERIFIED UNIVERSE (from ETF holdings — use ONLY these companies):
${etfLines}

Constituents:
${constituentLines}

Date: ${universe.asOf}

Produce the JSON brief now.`;
}

/**
 * Attempt to generate a structured Industry Research Brief.
 * Returns validated brief or null (best-effort — never blocks the main response).
 */
export async function generateIndustryBrief(
  query: string,
  universe: IndustryUniverse,
  model: LanguageModel,
): Promise<IndustryBriefValidated | null> {
  try {
    const result = await generateText({
      model,
      system: BRIEF_SYSTEM_PROMPT,
      prompt: buildBriefUserPrompt(query, universe),
      temperature: 0.3,
      maxOutputTokens: 4000,
    });

    // Strip code fences if LLM wraps response
    let text = result.text.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(text);
    const validated = IndustryBriefSchema.safeParse(parsed);

    if (!validated.success) {
      console.warn(
        "[industry-brief] schema validation failed:",
        validated.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      );
      return null;
    }

    return validated.data;
  } catch (err) {
    console.warn("[industry-brief] generation failed (best-effort):", err);
    return null;
  }
}
