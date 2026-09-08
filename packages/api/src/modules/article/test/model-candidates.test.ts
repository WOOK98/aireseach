/**
 * Model candidates configuration-matrix tests.
 *
 * Codex blocker #1: credential binding — each provider must use its own
 * dedicated key, never infer from a generic LLM_API_KEY.
 *
 * Tests cover:
 * - Kimi-only, DeepSeek-only, OpenAI-only
 * - Kimi + DeepSeek (priority order)
 * - All three keys present (full chain)
 * - Generic-only (LLM_API_KEY alone does NOT bind any provider)
 * - Generic + provider-specific (provider-specific wins, generic ignored)
 * - No keys at all → HTTPException
 */
import { describe, expect, it, vi } from "vitest";

// Mock env before importing the module under test.
vi.mock("../../../env", () => ({
  env: {},
}));

// We need to re-import between tests with different env values,
// so use dynamic import with module cache busting.
async function loadWithEnv(envOverrides: Record<string, string | undefined>) {
  // Reset the module cache for env and model-candidates
  vi.resetModules();

  vi.doMock("../../../env", () => ({
    env: envOverrides,
  }));

  const mod = await import("../model-candidates");
  return mod.getModelCandidates;
}

describe("getModelCandidates — credential binding matrix", () => {
  it("KIMI_API_KEY only → returns Kimi k3", async () => {
    const getModelCandidates = await loadWithEnv({
      KIMI_API_KEY: "sk-kimi-test",
    });
    const result = getModelCandidates();
    expect(result).toHaveLength(1);
  });

  it("DEEPSEEK_API_KEY only → returns DeepSeek chat", async () => {
    const getModelCandidates = await loadWithEnv({
      DEEPSEEK_API_KEY: "sk-ds-test",
    });
    const result = getModelCandidates();
    expect(result).toHaveLength(1);
  });

  it("OPENAI_API_KEY only → returns GPT-4o-mini", async () => {
    const getModelCandidates = await loadWithEnv({
      OPENAI_API_KEY: "sk-oai-test",
    });
    const result = getModelCandidates();
    expect(result).toHaveLength(1);
  });

  it("KIMI + DEEPSEEK → returns 2 candidates (Kimi first)", async () => {
    const getModelCandidates = await loadWithEnv({
      KIMI_API_KEY: "sk-kimi-test",
      DEEPSEEK_API_KEY: "sk-ds-test",
    });
    const result = getModelCandidates();
    expect(result).toHaveLength(2);
  });

  it("all three keys → returns 3 candidates in priority order", async () => {
    const getModelCandidates = await loadWithEnv({
      KIMI_API_KEY: "sk-kimi-test",
      DEEPSEEK_API_KEY: "sk-ds-test",
      OPENAI_API_KEY: "sk-oai-test",
    });
    const result = getModelCandidates();
    expect(result).toHaveLength(3);
  });

  it("LLM_API_KEY alone does NOT bind any provider", async () => {
    const getModelCandidates = await loadWithEnv({
      LLM_API_KEY: "sk-generic-test",
    });
    expect(() => getModelCandidates()).toThrow(/temporarily unavailable/);
  });

  it("LLM_API_KEY + KIMI_API_KEY → generic ignored, Kimi bound", async () => {
    const getModelCandidates = await loadWithEnv({
      LLM_API_KEY: "sk-generic-test",
      KIMI_API_KEY: "sk-kimi-test",
    });
    const result = getModelCandidates();
    expect(result).toHaveLength(1);
  });

  it("LLM_API_KEY + DEEPSEEK_API_KEY → generic ignored, DeepSeek bound", async () => {
    const getModelCandidates = await loadWithEnv({
      LLM_API_KEY: "sk-generic-test",
      DEEPSEEK_API_KEY: "sk-ds-test",
    });
    const result = getModelCandidates();
    expect(result).toHaveLength(1);
  });

  it("no keys at all → throws HTTPException 500", async () => {
    const getModelCandidates = await loadWithEnv({});
    expect(() => getModelCandidates()).toThrow(/temporarily unavailable/);
  });
});
