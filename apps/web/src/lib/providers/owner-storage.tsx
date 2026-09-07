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
 * **Identity transition:** On A→B account switch, calls clearOwnerId()
 * before setOwnerId() so stale A object URLs are revoked and the
 * generation counter reflects the actual transition. Same-user
 * session updates (e.g. token refresh) are idempotent — no generation
 * bump, no URL revocation.
 *
 * **Query invalidation:** On identity change, all react-query caches
 * are invalidated so components refetch with the new owner's data.
 *
 * This provider MUST render before any component that reads/writes
 * local storage (notes, PDFs, annotations).
 */

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

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

  useEffect(() => {
    // Wait for the auth session to resolve before applying ownership.
    if (session.isPending) return;

    const userId = session.data?.user?.id ?? null;

    if (userId) {
      const currentOwner = getOwnerId();
      if (currentOwner !== userId) {
        // Identity changed (or first set) — transition cleanly.
        // setOwnerId internally calls clearOwnerId → revokeActiveUrls
        // before setting the new owner and incrementing generation.
        setOwnerId(userId);

        // Invalidate all queries so components refetch with new owner's data.
        if (prevOwnerRef.current !== null && prevOwnerRef.current !== userId) {
          void queryClient.invalidateQueries();
        }
      }
    } else {
      // No authenticated user — clear any stale owner.
      clearOwnerId();
      if (prevOwnerRef.current !== null) {
        void queryClient.invalidateQueries();
      }
    }

    prevOwnerRef.current = userId;
    setReady(true);
  }, [session, queryClient]);

  // Don't render children until the session has resolved and ownership
  // has been applied (or confirmed unauthenticated).
  // This prevents storage consumers from mounting with owner=null.
  if (!ready) return null;

  return <>{children}</>;
};
