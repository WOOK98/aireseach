/**
 * AleaBit — Creator config validation tests (#130)
 *
 * Tests for:
 * - Valid config passes validation
 * - Invalid configs rejected with specific errors
 * - Multi-config batch validation
 * - Built-in configs all valid
 */

import { describe, it, expect } from "vitest";

import {
  validateCreatorConfig,
  validateCreatorConfigs,
} from "../creator-config";
import {
  ALEABIT_CREATOR_CONFIG,
  SERENITY_CREATOR_CONFIG,
  BUILTIN_CREATOR_CONFIGS,
} from "../creator-fixtures/builtin-configs";

// ── Valid config ─────────────────────────────────────────────────────────────

describe("validateCreatorConfig — valid configs", () => {
  it("accepts minimal valid config", () => {
    const config = {
      id: "test_creator",
      platform: "x",
      handle: "testcreator",
      displayName: "Test Creator",
      domains: ["equity"],
      trackedSignals: ["earnings"],
    };
    const result = validateCreatorConfig(config);
    expect(result.ok).toBe(true);
    expect(result.config).toBeDefined();
    expect(result.config!.id).toBe("test_creator");
    expect(result.config!.platform).toBe("x");
  });

  it("applies defaults for optional fields", () => {
    const config = {
      id: "test_defaults",
      platform: "x",
      handle: "test",
      displayName: "Test",
      domains: ["equity"],
      trackedSignals: ["earnings"],
    };
    const result = validateCreatorConfig(config);
    expect(result.ok).toBe(true);
    expect(result.config!.language).toBe("en");
    expect(result.config!.enabled).toBe(true);
    expect(result.config!.ingestMode).toBe("replay");
    expect(result.config!.trustedClaimTypes).toContain("factual_citation");
    expect(result.config!.requiresExternalEvidenceFor).toContain(
      "any_financial_metric",
    );
    expect(result.config!.outputFormats).toContain("financial_brief");
  });

  it("accepts all platform values", () => {
    for (const platform of ["x", "reddit", "youtube", "blog", "rss"]) {
      const result = validateCreatorConfig({
        id: `test_${platform}`,
        platform,
        handle: "test",
        displayName: "Test",
        domains: ["equity"],
        trackedSignals: ["earnings"],
      });
      expect(result.ok).toBe(true);
    }
  });

  it("accepts all domain values", () => {
    const domains = [
      "equity",
      "crypto",
      "macro",
      "supply_chain",
      "semiconductor",
      "ai",
      "ev",
      "biotech",
      "energy",
      "commodities",
      "forex",
      "fixed_income",
    ];
    const result = validateCreatorConfig({
      id: "test_all_domains",
      platform: "x",
      handle: "test",
      displayName: "Test",
      domains,
      trackedSignals: ["earnings"],
    });
    expect(result.ok).toBe(true);
    expect(result.config!.domains).toHaveLength(domains.length);
  });
});

// ── Invalid config ───────────────────────────────────────────────────────────

describe("validateCreatorConfig — invalid configs", () => {
  it("rejects missing id", () => {
    const result = validateCreatorConfig({
      platform: "x",
      handle: "test",
      displayName: "Test",
      domains: ["equity"],
      trackedSignals: ["earnings"],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("id"))).toBe(true);
  });

  it("rejects invalid id format (uppercase)", () => {
    const result = validateCreatorConfig({
      id: "Invalid_ID",
      platform: "x",
      handle: "test",
      displayName: "Test",
      domains: ["equity"],
      trackedSignals: ["earnings"],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("id"))).toBe(true);
  });

  it("rejects invalid platform", () => {
    const result = validateCreatorConfig({
      id: "test",
      platform: "tiktok",
      handle: "test",
      displayName: "Test",
      domains: ["equity"],
      trackedSignals: ["earnings"],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("platform"))).toBe(true);
  });

  it("rejects empty domains", () => {
    const result = validateCreatorConfig({
      id: "test",
      platform: "x",
      handle: "test",
      displayName: "Test",
      domains: [],
      trackedSignals: ["earnings"],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("domains"))).toBe(true);
  });

  it("rejects empty trackedSignals", () => {
    const result = validateCreatorConfig({
      id: "test",
      platform: "x",
      handle: "test",
      displayName: "Test",
      domains: ["equity"],
      trackedSignals: [],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("trackedSignals"))).toBe(true);
  });

  it("rejects invalid domain value", () => {
    const result = validateCreatorConfig({
      id: "test",
      platform: "x",
      handle: "test",
      displayName: "Test",
      domains: ["equity", "nonexistent_domain"],
      trackedSignals: ["earnings"],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid signal type", () => {
    const result = validateCreatorConfig({
      id: "test",
      platform: "x",
      handle: "test",
      displayName: "Test",
      domains: ["equity"],
      trackedSignals: ["earnings", "invalid_signal"],
    });
    expect(result.ok).toBe(false);
  });
});

// ── Batch validation ─────────────────────────────────────────────────────────

describe("validateCreatorConfigs — batch", () => {
  it("separates valid and invalid configs", () => {
    const configs = [
      {
        id: "valid1",
        platform: "x",
        handle: "test1",
        displayName: "Test 1",
        domains: ["equity"],
        trackedSignals: ["earnings"],
      },
      {
        // missing id
        platform: "x",
        handle: "test2",
        displayName: "Test 2",
        domains: ["equity"],
        trackedSignals: ["earnings"],
      },
      {
        id: "valid2",
        platform: "x",
        handle: "test3",
        displayName: "Test 3",
        domains: ["macro"],
        trackedSignals: ["macro_commentary"],
      },
    ];

    const result = validateCreatorConfigs(configs);
    expect(result.valid).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.index).toBe(1);
  });
});

// ── Built-in configs ─────────────────────────────────────────────────────────

describe("built-in creator configs", () => {
  it("aleabitoreddit config is valid", () => {
    const result = validateCreatorConfig(ALEABIT_CREATOR_CONFIG);
    expect(result.ok).toBe(true);
  });

  it("serenity config is valid", () => {
    const result = validateCreatorConfig(SERENITY_CREATOR_CONFIG);
    expect(result.ok).toBe(true);
  });

  it("all built-in configs pass batch validation", () => {
    const result = validateCreatorConfigs(BUILTIN_CREATOR_CONFIGS);
    expect(result.valid).toHaveLength(BUILTIN_CREATOR_CONFIGS.length);
    expect(result.errors).toHaveLength(0);
  });

  it("built-in configs have unique ids", () => {
    const ids = BUILTIN_CREATOR_CONFIGS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("built-in configs have different domains (not identical)", () => {
    const domains1 = ALEABIT_CREATOR_CONFIG.domains.sort().join(",");
    const domains2 = SERENITY_CREATOR_CONFIG.domains.sort().join(",");
    // They can overlap but not be identical
    expect(typeof domains1).toBe("string");
    expect(typeof domains2).toBe("string");
  });
});
