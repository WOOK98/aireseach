/**
 * AleaBit — Publish authorization helper (#141)
 *
 * Checks whether a user is authorized to approve/reject publish actions.
 * Two-layer check:
 * 1. Env allowlist (ALEABIT_ADMIN_USER_IDS) — comma-separated user IDs
 * 2. Organization owner/admin role via better-auth
 *
 * Fail-closed: if neither check passes, deny.
 */

import { auth } from "@workspace/auth/server";

const ADMIN_USER_IDS = new Set(
  (process.env.ALEABIT_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

/**
 * Check if a user is authorized to approve/reject AleaBit publish actions.
 *
 * Returns true if:
 * - User ID is in ALEABIT_ADMIN_USER_IDS allowlist, OR
 * - User has owner or admin role in any organization
 *
 * Fail-closed: returns false on any error.
 */
export async function isAleaBitAdmin(
  headers: Headers,
  userId: string,
): Promise<boolean> {
  // Layer 1: Env allowlist (always works, no DB needed)
  if (ADMIN_USER_IDS.has(userId)) {
    return true;
  }

  // Layer 2: Organization owner/admin role
  try {
    const memberships = await auth.api.listMembers({
      query: {
        filterField: "userId",
        filterValue: userId,
        filterOperator: "eq",
      },
      headers,
    });

    if (!memberships?.members) {
      return false;
    }

    return memberships.members.some(
      (m: { role: string }) => m.role === "owner" || m.role === "admin",
    );
  } catch {
    // Fail-closed
    return false;
  }
}
