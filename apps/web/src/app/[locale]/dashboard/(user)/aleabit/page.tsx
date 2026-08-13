/**
 * AleaBit Review Queue — Dashboard Page (#121)
 *
 * Displays shadow-run results from replay fixtures.
 * Shows queue status, trigger posts, classification, entity, evidence,
 * structured JSON, and rendered 16:9 brief artifact.
 *
 * This page is for internal review only. No X publish/reply/quote/upload.
 */
/* oxlint-disable i18next/no-literal-string */

import { runShadowRun } from "@workspace/api/aleabit/shadow-run";

import type { QueueItem } from "@workspace/api/aleabit/queue-interface";

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ready_for_review:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    needs_review:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    skipped: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    detected:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    researching:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        colors[status] ?? colors.detected
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ── Queue item detail ────────────────────────────────────────────────────────

function QueueItemDetail({ item }: { item: QueueItem }) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusBadge status={item.status} />
          <span className="text-muted-foreground font-mono text-xs">
            {item.conversationId}
          </span>
          {item.category && (
            <span className="rounded-full border px-2 py-0.5 text-[10px]">
              {item.category}
            </span>
          )}
        </div>
        <span className="text-muted-foreground text-xs">v{item.version}</span>
      </div>

      {/* Trigger post */}
      <div className="bg-muted/30 rounded p-3 text-sm">
        <div className="text-muted-foreground mb-1 text-[10px] tracking-wider uppercase">
          Trigger Post
        </div>
        <p className="text-foreground leading-relaxed">
          {item.triggerPost.text.slice(0, 300)}
          {item.triggerPost.text.length > 300 ? "..." : ""}
        </p>
        <div className="text-muted-foreground mt-2 flex gap-4 text-[11px]">
          <span>@{item.triggerPost.authorHandle}</span>
        </div>
      </div>

      {/* Classification */}
      {item.classification && (
        <div className="text-xs">
          <span className="text-muted-foreground">Classification: </span>
          <span className="font-semibold">{item.classification.category}</span>
          <span className="text-muted-foreground ml-2">
            ({Math.round(item.classification.confidence * 100)}%)
          </span>
          <span className="text-muted-foreground ml-2">
            — {item.classification.reasoning}
          </span>
        </div>
      )}

      {/* Entity */}
      {item.entity && (
        <div className="text-xs">
          <span className="text-muted-foreground">Entity: </span>
          {item.entity.ok ? (
            <>
              <span className="notranslate font-semibold" translate="no">
                {item.entity.companyName} ({item.entity.ticker})
              </span>
              <span
                className="notranslate text-muted-foreground ml-2"
                translate="no"
              >
                {item.entity.market}
              </span>
            </>
          ) : (
            <span className="text-red-500">Not resolved</span>
          )}
          {item.entity.needsReview && (
            <span className="ml-2 text-amber-500">needs review</span>
          )}
        </div>
      )}

      {/* Evidence gate */}
      {item.evidenceGate && (
        <div className="text-xs">
          <span className="text-muted-foreground">Evidence gate: </span>
          <span
            className={
              item.evidenceGate.allowed ? "text-emerald-500" : "text-red-500"
            }
          >
            {item.evidenceGate.allowed ? "PASSED" : "BLOCKED"}
          </span>
          <span className="text-muted-foreground ml-2">
            — {item.evidenceGate.reason}
          </span>
        </div>
      )}

      {/* Skip/failure reason */}
      {(item.skipReason || item.failureReason) && (
        <div className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
          {item.skipReason || item.failureReason}
        </div>
      )}

      {/* Rendered brief artifact */}
      {item.renderedHtml && (
        <div className="space-y-2">
          <div className="text-muted-foreground text-xs font-semibold">
            Rendered Artifact
          </div>
          <div className="overflow-hidden rounded-lg border">
            <iframe
              srcDoc={item.renderedHtml}
              className="w-full"
              style={{ height: "540px", aspectRatio: "16/9" }}
              title={`Brief artifact: ${item.conversationId}`}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}

      {/* Structured JSON (collapsed) */}
      {item.brief && (
        <details className="text-xs">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer font-semibold">
            Structured JSON ({item.brief.metrics.length} metrics,{" "}
            {item.brief.sources.length} sources)
          </summary>
          <pre className="bg-muted/30 mt-2 max-h-64 overflow-auto rounded p-3 text-[11px]">
            {JSON.stringify(item.brief, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default async function AleaBitQueuePage() {
  const result = await runShadowRun();

  return (
    <div className="container mx-auto max-w-5xl space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-bold">AleaBit Review Queue</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Shadow-run results from replay fixtures.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-5 gap-4">
        {[
          {
            label: "Total",
            value: result.summary.total,
            color: "text-foreground",
          },
          {
            label: "Ready",
            value: result.summary.readyForReview,
            color: "text-emerald-500",
          },
          {
            label: "Needs Review",
            value: result.summary.needsReview,
            color: "text-amber-500",
          },
          {
            label: "Skipped",
            value: result.summary.skipped,
            color: "text-gray-500",
          },
          {
            label: "Failed",
            value: result.summary.failed,
            color: "text-red-500",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border p-4 text-center">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-muted-foreground text-xs">{label}</div>
          </div>
        ))}
      </div>

      {/* Queue items */}
      <div className="space-y-4">
        {result.items.map((item: QueueItem) => (
          <QueueItemDetail key={item.id} item={item} />
        ))}
      </div>

      {/* Footer */}
      <div className="text-muted-foreground border-t pt-4 text-xs">
        Shadow-run against replay fixtures only. No X publish capability.
      </div>
    </div>
  );
}
