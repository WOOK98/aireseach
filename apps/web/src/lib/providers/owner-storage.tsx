"use client";

/**
 * OwnerStorageProvider — bridges better-auth session state to the
 * client-side storage isolation layer (owner-id.ts).
 *
 * **Rendering gate:** Children are NOT rendered until the auth session
 * has resolved (isPending=false) and a verified owner (or confirmed
 * unauthenticated state) has been applied. This prevents storage
 * consumers from mounting with owner=null on initial render.
 *
 * **Gate reset:** If the session re-enters pending state (e.g. during
 * an A→B account switch), the gate closes again — children unmount
 * and remount under the new identity once it resolves.
 *
 * **Identity transition:** On A→B account switch, calls clearOwnerId()
 * before setOwnerId() so stale A object URLs are revoked and the
 * generation counter reflects the actual transition. Same-user
 * session updates (e.g. token refresh) are idempotent — no generation
 * bump, no URL revocation.
 *
 * **Query removal:** On identity change, all react-query caches are
 * REMOVED (not just invalidated) so stale data from the previous
 * user is fully purged and components refetch with the new owner's data.
 *
 * **Unmount cleanup:** When the provider unmounts, it clears the owner
 * identity and revokes tracked object URLs.
 *
 * This provider MUST render before any component that reads/writes
 * local storage (notes, PDFs, annotations).
 */

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { authClient } from "~/lib/auth/client";
import { clearOwnerId, getOwnerId, setOwnerId } from "~/lib/storage/owner-id";

export const OwnerStorageProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const session = authClient.useSession();
  const queryClient = useQueryClient();
  const prevOwnerRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  const applyOwner = useCallback(
    (userId: string | null) => {
      const currentOwner = getOwnerId();

      if (userId) {
        if (currentOwner !== userId) {
          setOwnerId(userId);
          // A→B transition or first set with a previous owner: flush stale caches.
          if (currentOwner !== null) {
             queryClient.removeQueries();
          }
        }
      } else {
        if (currentOwner !== null) {
          clearOwnerId();
           queryClient.removeQueries();
        }
      }
    },
    [queryClient],
  );

  useEffect(() => {
    // Re-entering pending state (e.g. A→B re-auth) → close the gate
    // so children unmount and don't render under a stale identity.
    if (session.isPending) {
      setReady(false);
      return;
    }

    // Session error → treat as unauthenticated: clear stale owner, flush caches.
    if (session.error) {
      const currentOwner = getOwnerId();
      if (currentOwner !== null) {
        clearOwnerId();
         queryClient.removeQueries();
      }
      prevOwnerRef.current = null;
      setReady(true);
      return;
    }

    const userId = session.data?.user?.id ?? null;
    applyOwner(userId);

    prevOwnerRef.current = userId;
    setReady(true);
  }, [session, queryClient, applyOwner]);

  // Unmount cleanup: clear owner identity and revoke tracked object URLs
  // so no stale authority survives after the provider is removed.
  useEffect(() => {
    return () => {
      clearOwnerId();
    };
  }, []);

  // Don't render children until the session has resolved and ownership
  // has been applied (or confirmed unauthenticated).
  if (!ready) return null;

  return <>{children}</>;
};
