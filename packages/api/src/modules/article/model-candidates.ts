/**
 * Model candidate list for article generation.
 *
 * Each provider binds EXACTLY to its own credential — never infer a provider
 * from a generic LLM_API_KEY.  Codex blocker #1 (credential binding).
 *
 * The ordered list is consumed by the retry loop so that a transient provider
 * failure does not block the entire request.  Codex blocker #2 (fallback chain).
 */
import { createOpenAI } from "@ai-sdk/openai";
import { HTTPException } from "hono/http-exception";

import { env } from "../../env";

import type { LanguageModel } from "ai";

/**
 * Build an ordered list of model candidates for article generation.
 * Tries Kimi → DeepSeek → OpenAI.  Each provider is only included when
 * its DEDICATED env var is set — a generic LLM_API_KEY is never used to
 * bind a specific provider.
 */
export function getModelCandidates(): LanguageModel[] {
  const candidates: LanguageModel[] = [];

  if (env.KIMI_API_KEY) {
    const kimi = createOpenAI({
      apiKey: env.KIMI_API_KEY,
      baseURL: "https://api.kimi.com/coding/v1",
    });
    candidates.push(kimi("k3"));
  }

  if (env.DEEPSEEK_API_KEY) {
    const deepseek = createOpenAI({
      apiKey: env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
    });
    candidates.push(deepseek.chat("deepseek-chat"));
  }

  if (env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
    candidates.push(openai("gpt-4o-mini"));
  }

  if (candidates.length === 0) {
    throw new HTTPException(500, {
      message: "Article generation is temporarily unavailable.",
    });
  }

  return candidates;
}
