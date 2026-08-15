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
 * For each enabled creator:
 * - `ingestMode === "live"` → use live adapter if token present, else skip
 * - `ingestMode === "replay"` → use replay adapter
 * - `ingestMode === "shadow"` → use replay adapter
 *
 * @param configs - Creator source configs
 * @param liveToken - X API Bearer token (read-only). Empty string = no live.
 */
export function buildCreatorAdapters(
  configs: CreatorSourceConfig[],
  liveToken: string,
): AdapterBuildResult {
  const adapters: CreatorSourceAdapter[] = [];
  const skipped: Array<{ creatorId: string; reason: string }> = [];

  for (const config of configs) {
    if (!config.enabled) continue;

    if (config.ingestMode === "live") {
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
