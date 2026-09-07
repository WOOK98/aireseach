"use client";

/**
 * OwnerStorageProvider — bridges better-auth session state to the
 * client-side storage isolation layer (owner-id.ts).
 *
 * **Rendering gate:** Children are NOT rendered until the auth session
 * has resolved (isPending=false) and a verified owner (or confirmed
 * unauthenticated state) has been applied. The gate resets on identity
 * transitions — when the verified owner changes (A→B, logout, re-enter
 * pending), children are unmounted and a fresh subtree mounts under the
 * new identity. This prevents stale A content from rendering under B.
 *
 * **Identity transition:** On A→B account switch, setOwnerId() internally
 * calls clearOwnerId → revokeActiveUrls → sets new owner. Owner-scoped
 * queries are removed (not just invalidated) so stale cached data is not
 * accessible during refetch. Same-user session updates (token refresh)
 * are idempotent — no generation bump, no URL revocation.
 *
 * **Unmount cleanup:** On provider unmount, clears owner identity and
 * revokes tracked object URLs to prevent resource leaks.
 *
 * This provider MUST render before any component that reads/writes
 * local storage (notes, PDFs, annotations).
 */

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { authClient } from "~/lib/auth/client";
import { clearOwnerId, getOwnerId, setOwnerId } from "~/lib/storage/owner-id";

/**
 * Remove all react-query caches.
 *
 * Owner-scoped data lives in localStorage/IndexedDB (isolated by
 * owner-id.ts), but derived/transformed query caches (note lists,
 * search results, etc.) must not persist across identity transitions.
 * removeQueries() is stronger than invalidateQueries() — it ensures
 * components mount with no data and must refetch from scratch under
 * the new identity.
 */
function flushQueryCache(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.removeQueries();
}

/**
 * Stable wrapper component whose `key` prop is used to force React
 * to unmount/remount the children subtree on identity changes.
 * Renders a bare Fragment — no extra DOM nodes.
 */
function IdentityGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export const OwnerStorageProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const session = authClient.useSession();
  const queryClient = useQueryClient();

  // Verified owner identity: null = unverified (initial) or unauthenticated.
  const [verifiedOwner, setVerifiedOwner] = useState<string | null>(null);

  // Whether we have completed at least one verification cycle.
  // false → children NOT rendered (gate closed).
  // true  → children render under verifiedOwner.
  const [gateReady, setGateReady] = useState(false);

  // Monotonic counter. Combined with the owner identity to produce a
  // unique React key. Incrementing forces React to unmount the old
  // subtree (destroying all component state — editors, scroll, forms)
  // and mount a fresh one under the new identity.
  const ownerKeyRef = useRef(0);

  const applyOwner = useCallback(
    (newOwner: string | null) => {
      const currentOwner = getOwnerId();

      if (newOwner) {
        if (currentOwner !== newOwner) {
          setOwnerId(newOwner);

          if (currentOwner !== null) {
            // A→B transition: flush stale caches.
            flushQueryCache(queryClient);
            ownerKeyRef.current += 1;
          }
        }
      } else {
        if (currentOwner !== null) {
          clearOwnerId();
          flushQueryCache(queryClient);
          ownerKeyRef.current += 1;
        }
      }

      setVerifiedOwner(newOwner);
      setGateReady(true);
    },
    [queryClient],
  );

  useEffect(() => {
    // Re-entering pending state (token refresh, re-auth) —
    // reset gate so children unmount and don't render with stale identity.
    if (session.isPending) {
      setGateReady(false);
      return;
    }

    if (session.error) {
      applyOwner(null);
      return;
    }

    const userId = session.data?.user?.id ?? null;
    applyOwner(userId);
  }, [session, applyOwner]);

  // Unmount cleanup: release ownership and revoke tracked URLs.
  useEffect(() => {
    return () => {
      clearOwnerId();
    };
  }, []);

  // Gate: don't render children until identity has been verified.
  if (!gateReady) return null;

  // The key forces a full React subtree remount on identity changes.
  // This destroys all component-level state (editor content, form
  // values, scroll positions) that could leak across accounts.
  // The storage layer (owner-id.ts) is already updated by applyOwner()
  // before we render, so even without the key, reads would return the
  // new owner's data — but stale React state in memory would persist.
  const identityKey = verifiedOwner ?? "__anon__";
  const remountKey = `${identityKey}__${ownerKeyRef.current}`;

  return <IdentityGate key={remountKey}>{children}</IdentityGate>;
};
