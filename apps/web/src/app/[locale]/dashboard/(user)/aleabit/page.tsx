/**
 * AleaBit Review Queue — Dashboard Page (#130)
 *
 * Displays multi-creator ingest results with creator/status filtering.
 * Shows queue status, trigger posts, classification, entity, evidence,
 * structured JSON, and rendered 16:9 brief artifact.
 *
 * This page is for internal review only. No X publish/reply/quote/upload.
 */
/* oxlint-disable i18next/no-literal-string eslint-plugin-next/no-img-element */

import type { QueueItem } from "@workspace/api/aleabit/queue-interface";

// Skip static prerender — DB may not be reachable at build time (Vercel).
export const dynamic = "force-dynamic";

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
    approved:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    archived:
      "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
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

// ── Creator badge ────────────────────────────────────────────────────────────

function CreatorBadge({
  creatorId,
  handle,
}: {
  creatorId: string;
  handle: string;
}) {
  const colors: Record<string, string> = {
    aleabitoreddit:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    serenity:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
        colors[creatorId] ??
        "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
      }`}
    >
      <span className="notranslate" translate="no">
        @{handle}
      </span>
    </span>
  );
}

// ── Queue item detail ────────────────────────────────────────────────────────

function QueueItemDetail({ item }: { item: QueueItem }) {
  const creatorId = item.creatorId ?? "unknown";

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusBadge status={item.status} />
          <CreatorBadge
            creatorId={creatorId}
            handle={item.triggerPost.authorHandle}
          />
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
          <span className="notranslate" translate="no">
            @{item.triggerPost.authorHandle}
          </span>
          <span className="notranslate" translate="no">
            {new Date(item.triggerPost.postedAt).toLocaleString()}
          </span>
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

      {/* Publish policy decision (#137) */}
      {item.policyDecision && (
        <div className="text-xs">
          <span className="text-muted-foreground">Publish policy: </span>
          <span
            className={
              item.policyDecision.verdict === "allowed"
                ? "text-emerald-500"
                : item.policyDecision.verdict === "shadow_only"
                  ? "text-blue-500"
                  : "text-red-500"
            }
          >
            {item.policyDecision.verdict.toUpperCase()}
          </span>
          <span className="text-muted-foreground ml-2">
            (mode: {item.policyDecision.rolloutMode}, v
            {item.policyDecision.policyVersion})
          </span>
          {item.policyDecision.blockingReasons.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {item.policyDecision.blockingReasons.map((r, i) => (
                <div key={i} className="text-[11px] text-red-400">
                  • {r}
                </div>
              ))}
            </div>
          )}
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

          {/* Bilingual PNG preview + download (#135) */}
          {item.brief && (
            <div className="space-y-2">
              <div className="text-muted-foreground text-xs font-semibold">
                Bilingual PNG (1600×900)
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(["zh-CN", "en"] as const).map((locale) => (
                  <div key={locale} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium">
                        {locale === "zh-CN" ? "中文" : "English"}
                      </span>
                      <a
                        href={`/api/aleabit/png?id=${item.id}&locale=${locale}`}
                        download={`aleabit_${item.brief?.ticker ?? "brief"}_${locale}.png`}
                        className="text-[10px] text-blue-500 hover:text-blue-400"
                      >
                        ↓ Download
                      </a>
                    </div>
                    {/* oxlint-disable-next-line eslint-plugin-next/no-img-element */}
                    <img
                      src={`/api/aleabit/png?id=${item.id}&locale=${locale}`}
                      alt={`Brief ${locale}`}
                      className="w-full rounded border"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
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

function FilterInfo({
  creators,
  statuses,
}: {
  creators: string[];
  statuses: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <span className="text-muted-foreground">Creators:</span>
      {creators.map((c) => (
        <span key={c} className="rounded border px-2 py-0.5">
          {c}
        </span>
      ))}
      <span className="text-muted-foreground ml-4">Statuses:</span>
      {statuses.map((s) => (
        <span key={s} className="rounded border px-2 py-0.5">
          {s.replace(/_/g, " ")}
        </span>
      ))}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default async function AleaBitQueuePage() {
  // Read-only: fetch existing queue items from DB. Ingest runs via POST /api/aleabit/ingest.
  let items: QueueItem[] = [];
  try {
    const { PersistentReviewQueue } =
      await import("@workspace/api/aleabit/queue-pg");
    const queue = new PersistentReviewQueue();
    items = await queue.getAll();
  } catch {
    // DB unavailable at build time — render empty state.
  }

  // Collect unique creators and statuses for filter display
  const uniqueCreators: string[] = [
    ...new Set(items.map((i) => i.triggerPost.authorHandle)),
  ];
  const uniqueStatuses: string[] = [...new Set(items.map((i) => i.status))];

  return (
    <div className="container mx-auto max-w-5xl space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-bold">AleaBit Review Queue</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Review queue items. Trigger ingest via{}
          <code className="bg-muted rounded px-1 text-xs">
            POST /api/aleabit/ingest
          </code>
          .
        </p>
      </div>

      {/* Filter info */}
      <FilterInfo creators={uniqueCreators} statuses={uniqueStatuses} />

      {/* Summary counts */}
      <div className="grid grid-cols-5 gap-4">
        {[
          {
            label: "Total",
            value: items.length,
            color: "text-foreground",
          },
          {
            label: "Ready",
            value: items.filter((i) => i.status === "ready_for_review").length,
            color: "text-emerald-500",
          },
          {
            label: "Needs Review",
            value: items.filter((i) => i.status === "needs_review").length,
            color: "text-amber-500",
          },
          {
            label: "Skipped",
            value: items.filter((i) => i.status === "skipped").length,
            color: "text-gray-500",
          },
          {
            label: "Failed",
            value: items.filter((i) => i.status === "failed").length,
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
      <div>
        <h2 className="mb-3 text-sm font-semibold">
          Queue Items ({items.length})
        </h2>
        <div className="space-y-4">
          {items.map((item: QueueItem) => (
            <QueueItemDetail key={item.id} item={item} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-muted-foreground border-t pt-4 text-xs">
        Read-only view. Trigger ingest via POST /api/aleabit/ingest. No X
        publish/reply/quote/upload capability.
      </div>
    </div>
  );
}
