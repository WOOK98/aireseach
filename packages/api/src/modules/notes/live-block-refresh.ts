import { isSafeRefreshUrl } from "./live-block-url-guard";

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
 * - http(s) URLs only (enforced upstream by the shared schema); on top of
 *   that, the URL guard (live-block-url-guard) refuses loopback / private /
 *   link-local / metadata targets and redirects are never followed blindly
 *   (`redirect: "manual"` — a redirect degrades to block-level `failed`).
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
  unsafeSource:
    "This source cannot be refreshed automatically. Showing last saved content.",
  redirect:
    "Source redirects elsewhere and cannot be verified automatically. Showing last saved content.",
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

  // SSRF guard: never probe loopback / private / link-local / metadata
  // targets from the server. Unsafe → neutral block-level failure, no fetch.
  if (!isSafeRefreshUrl(block.sourceUrl)) {
    return {
      staleState: "failed",
      lastRefreshedAt: now().toISOString(),
      refreshError: REFRESH_MESSAGES.unsafeSource,
    };
  }

  try {
    const res = await fetchFn(block.sourceUrl, {
      method: "GET",
      // Never follow redirects blindly — a safe URL can 302 into private
      // space. Manual mode + block-level failure keeps the user informed
      // without giving the URL server egress.
      redirect: "manual",
      signal: AbortSignal.timeout(deps.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    // We only verify reachability — discard the body promptly.
    await res.body?.cancel().catch(() => undefined);

    if (
      res.type === "opaqueredirect" ||
      (res.status >= 300 && res.status < 400)
    ) {
      return {
        staleState: "failed",
        lastRefreshedAt: now().toISOString(),
        refreshError: REFRESH_MESSAGES.redirect,
      };
    }

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
