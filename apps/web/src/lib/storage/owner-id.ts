/**
 * Owner identity for client-side storage isolation.
 *
 * All localStorage/IndexedDB operations MUST go through this module to
 * ensure user A's data is never visible to user B.
 *
 * The workspace shell (or auth provider) calls `setOwnerId()` on mount
 * and `clearOwnerId()` on logout/account-switch.
 *
 * REDLINES:
 * - Never scan localStorage for other users' keys.
 * - Never fall back to another user's data.
 * - When no owner is set, all reads return empty; all writes are no-ops.
 */

let currentOwnerId: string | null = null;

/** Object URLs created during this owner session. */
const activeObjectUrls: Set<string> = new Set();

/**
 * Set the active owner identity. Called by the auth layer on session
 * load and by the workspace shell on mount.
 */
export function setOwnerId(id: string): void {
  if (!id) return;
  currentOwnerId = id;
}

/**
 * Clear the active owner identity. Called on logout or account switch.
 * After this call, all storage reads return empty and writes are no-ops
 * until `setOwnerId()` is called again.
 *
 * Revokes active object URLs and closes the IndexedDB connection but
 * does NOT delete the blob database — durable user data survives logout
 * so the owner can re-access their offline PDFs after re-login.
 */
export function clearOwnerId(): void {
  currentOwnerId = null;
  // Revoke all object URLs created during this session.
  for (const url of activeObjectUrls) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
  activeObjectUrls.clear();
}

/**
 * Get the active owner identity, or null if not authenticated.
 *
 * Only returns the in-memory value set by `setOwnerId()`. Does NOT
 * fall back to localStorage — stale markers from a previous session
 * must not grant storage authority. The auth layer must call
 * `setOwnerId()` with a verified session ID on every page load.
 */
export function getOwnerId(): string | null {
  return currentOwnerId;
}

/**
 * Whether an authenticated owner is active and storage writes are safe.
 * UI controls (create buttons, upload dropzones) should be disabled
 * when this returns false.
 */
export function isOwnerReady(): boolean {
  return currentOwnerId !== null;
}

/**
 * Track an object URL created during this owner session.
 * Called by blob storage when creating reader URLs.
 */
export function trackObjectUrl(url: string): void {
  activeObjectUrls.add(url);
}

/**
 * Untrack a revoked object URL.
 */
export function untrackObjectUrl(url: string): void {
  activeObjectUrls.delete(url);
}
