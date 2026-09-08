"use client";

/**
 * OwnerStorageProvider — bridges better-auth session state to the
 * client-side storage isolation layer (owner-id.ts).
 *
 * **Synchronous gate:** Children are NOT rendered until the applied owner
 * identity MATCHES the session identity. The gate is derived in the render
 * phase — when the session identity changes (e.g. A→B), `ready` becomes
 * false immediately because `appliedOwner` still holds the old value.
 * There is no frame where children render under a stale identity.
 *
 * **Identity key:** Children are wrapped in a component keyed on the
 * applied owner. On identity transitions, React unmounts the entire
 * subtree and remounts it fresh, clearing component-local state
 * (editor drafts, unsaved form data) that removeQueries() cannot reach.
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
import { useCallback, useEffect, useState } from "react";

import { authClient } from "~/lib/auth/client";
import { clearOwnerId, getOwnerId, setOwnerId } from "~/lib/storage/owner-id";

/**
 * Pass-through wrapper keyed on owner identity. When the key changes
 * (A→B transition), React unmounts this component and all its children,
 * then remounts fresh — clearing local state that cache removal cannot reach.
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

  // Tracks the owner identity that has been applied via side effects.
  // undefined = not yet initialised (gate closed).
  // null = unauthenticated applied.
  // string = authenticated user id applied.
  const [appliedOwner, setAppliedOwner] = useState<string | null | undefined>(
    undefined,
  );

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

  // Effect: apply side effects and commit the applied owner.
  // The gate itself is derived synchronously in the render phase below.
  useEffect(() => {
    // Re-entering pending state (e.g. A→B re-auth):
    // Reset appliedOwner so the synchronous gate closes immediately.
    if (session.isPending) {
      setAppliedOwner(undefined);
      return;
    }

    // Session error → treat as unauthenticated.
    if (session.error) {
      const currentOwner = getOwnerId();
      if (currentOwner !== null) {
        clearOwnerId();
        queryClient.removeQueries();
      }
      setAppliedOwner(null);
      return;
    }

    const userId = session.data?.user?.id ?? null;
    applyOwner(userId);
    setAppliedOwner(userId);
  }, [session, queryClient, applyOwner]);

  // Unmount cleanup: clear owner identity and revoke tracked object URLs
  // so no stale authority survives after the provider is removed.
  useEffect(() => {
    return () => {
      clearOwnerId();
    };
  }, []);

  // ── Synchronous gate ──────────────────────────────────────────────────────
  //
  // Derive the "expected" owner from the current session state.
  // Compare it to `appliedOwner` (what side effects have committed).
  // When they diverge (identity transition, pending, error), the gate
  // closes synchronously in this render — no effect delay, no stale frame.
  //
  const expectedOwner = session.isPending
    ? undefined
    : session.error
      ? null
      : (session.data?.user?.id ?? null);

  const ready =
    appliedOwner !== undefined &&
    !session.isPending &&
    appliedOwner === expectedOwner;

  if (!ready) return null;

  // Key children on applied identity so React unmounts/remounts the
  // entire subtree on identity transitions. This clears component-local
  // state (editor drafts, form data) that removeQueries() cannot reach.
  return (
    <IdentityGate key={appliedOwner ?? "__unauthenticated"}>
      {children}
    </IdentityGate>
  );
};
