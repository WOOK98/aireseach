/**
 * AleaBit — Creator adapter factory (#133)
 *
 * Builds the right adapter per creator: live (X API v2) or replay (fixtures).
 * Selection is based on creator config's ingestMode and token availability.
 *
 * Fail-closed: if live mode is requested but no token, creator is skipped
 * with a clear reason in the summary — never silently succeeds.
 */

import { CreatorReplayAdapter } from "./creator-fixtures/multi-replay-adapter";
import { CreatorLiveAdapter } from "./creator-live-adapter";

import type { CreatorSourceAdapter } from "./creator-adapter";
import type { CreatorSourceConfig } from "./creator-config";

export interface AdapterBuildResult {
  adapters: CreatorSourceAdapter[];
  skipped: Array<{ creatorId: string; reason: string }>;
}

/**
 * Build adapters for all enabled creators.
 *
 * Live selection is determined by `liveCreators` set (from server-side env),
 * NOT by the creator config's `ingestMode` field. This ensures production
 * live ingest is controlled by deployment config, not by code defaults.
 *
 * For each enabled creator:
 * - in `liveCreators` set + token → CreatorLiveAdapter
 * - in `liveCreators` set + no token → skipped (fail-closed)
 * - not in `liveCreators` → replay/shadow (fixture-based)
 *
 * @param configs - Creator source configs
 * @param options.liveToken - X API Bearer token (read-only). Empty = no live.
 * @param options.liveCreators - Set of creator IDs to run in live mode.
 */
export function buildCreatorAdapters(
  configs: CreatorSourceConfig[],
  options: { liveToken: string; liveCreators: Set<string> },
): AdapterBuildResult {
  const { liveToken, liveCreators } = options;
  const adapters: CreatorSourceAdapter[] = [];
  const skipped: Array<{ creatorId: string; reason: string }> = [];

  for (const config of configs) {
    if (!config.enabled) continue;

    const isLive = liveCreators.has(config.id) || config.ingestMode === "live";

    if (isLive) {
      if (!liveToken) {
        skipped.push({
          creatorId: config.id,
          reason: "Live mode requested but no X API token configured.",
        });
        continue;
      }
      adapters.push(new CreatorLiveAdapter(config, liveToken));
    } else {
      // replay or shadow → fixture-based
      adapters.push(new CreatorReplayAdapter(config));
    }
  }

  return { adapters, skipped };
}

/**
 * Parse the ALEABIT_LIVE_CREATORS env var.
 * Format: comma-separated creator IDs, e.g. "aleabitoreddit,serenity".
 * Empty string or missing → empty set (all replay).
 */
export function parseLiveCreators(env: string | undefined): Set<string> {
  if (!env) return new Set();
  return new Set(
    env
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}
