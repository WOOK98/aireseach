/**
 * AleaBit — Canary approval actions client component (#141)
 *
 * Renders approve/reject buttons for queue items in ready_for_review status.
 * Only visible when canary mode is active (server-side check).
 * Calls POST /api/aleabit/approve or /api/aleabit/reject.
 */

"use client";

import { useCallback, useState } from "react";

interface CanaryActionsProps {
  itemId: string;
  currentStatus: string;
  canaryMode: boolean;
}

export function CanaryActions({
  itemId,
  currentStatus,
  canaryMode,
}: CanaryActionsProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [reason, setReason] = useState("");

  const handleAction = useCallback(
    async (action: "approve" | "reject") => {
      if (!reason.trim()) {
        setResult({ type: "error", message: "Reason is required." });
        return;
      }

      setLoading(true);
      setResult(null);

      try {
        const endpoint =
          action === "approve" ? "/api/aleabit/approve" : "/api/aleabit/reject";

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId,
            reason: reason.trim(),
            actorId: "dashboard-user",
          }),
        });

        const errData = res.ok
          ? null
          : ((await res.json()) as { error?: string });
        if (!res.ok) {
          setResult({
            type: "error",
            message: errData?.error ?? "Unknown error",
          });
        } else {
          setResult({
            type: "success",
            message: `Item ${action === "approve" ? "approved" : "rejected"} successfully.`,
          });
          // Refresh the page to reflect new status
          setTimeout(() => window.location.reload(), 1000);
        }
      } catch {
        setResult({ type: "error", message: "Network error." });
      } finally {
        setLoading(false);
      }
    },
    [itemId, reason],
  );

  // Only show for ready_for_review items in canary mode
  if (!canaryMode || currentStatus !== "ready_for_review") {
    return null;
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
      <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
        {"Canary Approval"}
      </div>
      <div className="mt-2 space-y-2">
        <input
          type="text"
          placeholder="Reason for approve/reject (required)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded border px-2 py-1.5 text-xs"
          disabled={loading}
        />
        <div className="flex gap-2">
          <button
            onClick={() => handleAction("approve")}
            disabled={loading || !reason.trim()}
            className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "..." : "✓ Approve"}
          </button>
          <button
            onClick={() => handleAction("reject")}
            disabled={loading || !reason.trim()}
            className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "..." : "✗ Reject"}
          </button>
        </div>
        {result && (
          <div
            className={`text-xs ${
              result.type === "success" ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}
