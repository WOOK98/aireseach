/**
 * Live Blocks — refresher (#167)
 *
 * v1 refresh semantics (honest by construction):
 * - url-backed blocks: re-check source reachability with a short timeout.
 *   reachable → fresh + lastRefreshedAt; unreachable → failed + neutral
 *   reason. Captured content is NEVER rewritten by refresh.
 * - blocks without a sourceUrl: manual_only (nothing live to check).
 *
 * REDLINES:
 * - never throws: any failure degrades to block-level `failed`.
 * - no module-top-level side effects (safe to import anywhere).
 * - user-visible reasons are neutral: no env / provider / internal paths.
 * - http(s) URLs only (enforced upstream by the shared schema).
 */
import type {
  LiveBlock,
  LiveBlockStaleState,
} from "@workspace/shared/schema/live-block";

export interface RefreshOutcome {
  staleState: LiveBlockStaleState;
  lastRefreshedAt?: string;
  /** Neutral, user-visible. Undefined clears a previous error. */
  refreshError?: string;
}

export interface RefreshDeps {
  fetchFn?: typeof fetch;
  now?: () => Date;
  timeoutMs?: number;
}

/** Neutral user-visible messages — no internals, no provider names. */
export const REFRESH_MESSAGES = {
  unreachable: "Source could not be reached. Showing last saved content.",
  httpError: (status: number) =>
    `Source returned an error (HTTP ${status}). Showing last saved content.`,
} as const;

const DEFAULT_TIMEOUT_MS = 8000;

export async function refreshLiveBlock(
  block: LiveBlock,
  deps: RefreshDeps = {},
): Promise<RefreshOutcome> {
  const now = deps.now ?? (() => new Date());

  // Nothing live to re-check → explicitly manual, not silently "fresh".
  if (!block.sourceUrl) {
    return { staleState: "manual_only" };
  }

  const fetchFn = deps.fetchFn ?? globalThis.fetch?.bind(globalThis);
  if (!fetchFn) {
    return { staleState: "manual_only" };
  }

  try {
    const res = await fetchFn(block.sourceUrl, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(deps.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    // We only verify reachability — discard the body promptly.
    await res.body?.cancel().catch(() => undefined);

    if (res.ok) {
      return {
        staleState: "fresh",
        lastRefreshedAt: now().toISOString(),
      };
    }
    return {
      staleState: "failed",
      lastRefreshedAt: now().toISOString(),
      refreshError: REFRESH_MESSAGES.httpError(res.status),
    };
  } catch {
    return {
      staleState: "failed",
      lastRefreshedAt: now().toISOString(),
      refreshError: REFRESH_MESSAGES.unreachable,
    };
  }
}
