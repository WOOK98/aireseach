"use client";

/* oxlint-disable i18next/no-literal-string */

import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  ShieldQuestion,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { Checkbox } from "@workspace/ui-web/checkbox";

import type { FeedItem, VerificationStatus } from "./use-feed";

// ── Status config ────────────────────────────────────────────────────────

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof CheckCircle2;
  description: string;
}

const STATUS_MAP: Record<VerificationStatus, StatusConfig> = {
  never_generated: {
    label: "No Judgment",
    color: "text-muted-foreground",
    bgColor: "bg-muted/30",
    borderColor: "border-border",
    icon: HelpCircle,
    description: "No report has been generated for this company yet.",
  },
  not_due: {
    label: "Tracking",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    icon: Clock,
    description: "Judgment logged. Verification scheduled.",
  },
  awaiting: {
    label: "Awaiting Verification",
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    icon: Activity,
    description: "Judgment is due for verification. Run verification to check.",
  },
  confirmed: {
    label: "Confirmed",
    color: "text-emerald-700 dark:text-emerald-300",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
    description: "Latest verification confirmed the judgment holds.",
  },
  invalidated: {
    label: "Invalidated",
    color: "text-red-700 dark:text-red-300",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-800",
    icon: XCircle,
    description:
      "Latest verification found the invalidation condition triggered.",
  },
  needs_manual_review: {
    label: "Needs Review",
    color: "text-orange-700 dark:text-orange-300",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-200 dark:border-orange-800",
    icon: ShieldQuestion,
    description:
      "Condition cannot be machine-verified. Manual review required.",
  },
  insufficient_data: {
    label: "Data Unavailable",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-50 dark:bg-gray-900/30",
    borderColor: "border-gray-200 dark:border-gray-700",
    icon: AlertTriangle,
    description: "Market data was unavailable at verification time.",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFutureDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) return "now";
  if (diffDays === 1) return "tomorrow";
  if (diffDays < 7) return `in ${diffDays}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface DistanceInfo {
  text: string;
  level: "triggered" | "approaching" | "safe";
}

/** Parse wrongIf into a structured distance description. */
function invalidationDistance(item: FeedItem): DistanceInfo | null {
  const j = item.latestJudgment;
  if (!j?.trigger) return null;

  const v = item.latestVerification;
  if (!v?.dataPoint) return null;

  const triggerMatch = j.trigger.match(/([<>]=?)\s*([\d,.]+)/);
  const dataMatch = v.dataPoint.match(/([\d,.]+)/);

  if (triggerMatch && dataMatch) {
    const op = triggerMatch[1]!;
    const threshold = parseFloat(triggerMatch[2]!.replace(/,/g, ""));
    const current = parseFloat(dataMatch[1]!.replace(/,/g, ""));

    if (!isNaN(threshold) && !isNaN(current) && threshold !== 0) {
      const absDiff = Math.abs(current - threshold);
      const unit = j.trigger.replace(/[<>]=?\s*[\d,.]+/, "").trim();
      const pctOfThreshold = absDiff / Math.abs(threshold);

      // Operator-aware: does the current value actually trigger the condition?
      //   "<" means wrongIf fires when value < threshold
      //   ">" means wrongIf fires when value > threshold
      let triggered = false;
      switch (op) {
        case "<":
          triggered = current < threshold;
          break;
        case "<=":
          triggered = current <= threshold;
          break;
        case ">":
          triggered = current > threshold;
          break;
        case ">=":
          triggered = current >= threshold;
          break;
        default:
          break;
      }

      let level: DistanceInfo["level"];
      if (triggered) {
        level = "triggered";
      } else if (pctOfThreshold < 0.1) {
        level = "approaching";
      } else {
        level = "safe";
      }

      // Build human-readable text:
      // "5.2% above trigger" / "2.1% below trigger"
      const aboveBelow = current >= threshold ? "above" : "below";

      return {
        text: `${absDiff.toFixed(1)}${unit} ${aboveBelow} trigger`,
        level,
      };
    }
  }

  return null;
}

// ── Sub-components ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: VerificationStatus }) {
  const config = STATUS_MAP[status];
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${config.color} ${config.bgColor} ${config.borderColor}`}
    >
      <Icon className="h-3 w-3" />
      <span className="notranslate" translate="no">
        {config.label}
      </span>
    </span>
  );
}

function ChangeStrength({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-[10px] text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
      <Activity className="h-2.5 w-2.5" />
      <span className="notranslate" translate="no">
        {count} verification{count > 1 ? "s" : ""} (30d)
      </span>
    </span>
  );
}

function DistanceBadge({ distance }: { distance: DistanceInfo | null }) {
  if (!distance) return null;

  const levelConfig = {
    triggered: {
      border: "border-red-200 dark:border-red-800",
      bg: "bg-red-50 dark:bg-red-950/30",
      text: "text-red-700 dark:text-red-300",
      Icon: ArrowDownRight,
    },
    approaching: {
      border: "border-amber-200 dark:border-amber-800",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      text: "text-amber-700 dark:text-amber-300",
      Icon: ArrowDownRight,
    },
    safe: {
      border: "border-emerald-200 dark:border-emerald-800",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      text: "text-emerald-700 dark:text-emerald-300",
      Icon: ArrowUpRight,
    },
  } as const;

  const config = levelConfig[distance.level];
  const Icon = config.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] ${config.border} ${config.bg} ${config.text}`}
    >
      <Icon className="h-2.5 w-2.5" />
      <span className="notranslate" translate="no">
        {distance.text}
      </span>
    </span>
  );
}

// ── Main card ────────────────────────────────────────────────────────────

export function JudgmentCard({
  item,
  selected,
  onToggle,
  selectable,
}: {
  item: FeedItem;
  selected?: boolean;
  onToggle?: () => void;
  selectable?: boolean;
}) {
  const statusConfig = STATUS_MAP[item.verificationStatus];
  const distance = invalidationDistance(item);
  const j = item.latestJudgment;
  const v = item.latestVerification;

  return (
    <div
      className={`group rounded-xl border p-5 transition hover:shadow-sm ${statusConfig.borderColor} bg-card`}
    >
      {/* Header row */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            {selectable && onToggle && (
              <Checkbox
                checked={selected}
                onCheckedChange={() => onToggle()}
                aria-label={`Select ${item.symbol} for comparison`}
                className="mt-0.5"
              />
            )}
            <Link
              href={`/t/${item.symbol}`}
              className="notranslate font-serif text-lg font-semibold hover:underline"
              translate="no"
            >
              {item.symbol}
            </Link>
            <span
              className="notranslate text-muted-foreground font-mono text-xs"
              translate="no"
            >
              {item.market}
            </span>
            <StatusBadge status={item.verificationStatus} />
          </div>

          {/* Judgment text */}
          {j ? (
            <p className="text-foreground/80 line-clamp-2 text-sm leading-relaxed">
              {j.judgment}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm italic">
              {statusConfig.description}
            </p>
          )}
        </div>

        {/* Key number */}
        {j && (
          <div className="shrink-0 text-right">
            <p className="text-muted-foreground font-mono text-[10px] uppercase">
              Key Number
            </p>
            <p
              className="notranslate font-mono text-sm font-semibold"
              translate="no"
            >
              {j.keyNumber}
            </p>
          </div>
        )}
      </div>

      {/* Meta row */}
      {j && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <ChangeStrength count={item.recentVerificationCount} />
          <DistanceBadge distance={distance} />
        </div>
      )}

      {/* WrongIf / invalidation condition */}
      {j && (
        <div className="border-border/50 bg-muted/20 mb-3 rounded-lg border px-3 py-2">
          <p className="text-muted-foreground mb-0.5 font-mono text-[10px] tracking-wider uppercase">
            Invalidation Condition
          </p>
          <p className="text-foreground/80 text-xs leading-relaxed">
            <span className="notranslate" translate="no">
              {j.wrongIf}
            </span>
          </p>
          {/* Verification data point */}
          {v?.dataPoint && (
            <p className="text-muted-foreground mt-1 font-mono text-[10px]">
              Last check:{" "}
              <span className="notranslate" translate="no">
                {v.dataPoint}
              </span>{" "}
              · {formatDate(v.verifiedAt)}
            </p>
          )}
        </div>
      )}

      {/* Next check / timing */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-muted-foreground flex items-center gap-3 text-[11px]">
          {item.nextCheckAfter && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Next verification: {formatFutureDate(item.nextCheckAfter)}
            </span>
          )}
          {item.lastVerifiedAt && (
            <span>Last verified: {formatDate(item.lastVerifiedAt)}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href={`/t/${item.symbol}`}
            className="border-line hover:bg-muted inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition"
          >
            <FileText className="h-3 w-3" />
            View Report
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Empty states ─────────────────────────────────────────────────────────

export function EmptyStateNoWatchlist() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="bg-muted rounded-full p-5">
        <Activity className="text-muted-foreground h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h3 className="text-foreground text-lg font-semibold">
          Your Watchlist is Empty
        </h3>
        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
          Add companies to your watchlist to track judgment changes. Each
          company you follow gets a judgment card powered by ledger
          verification.
        </p>
      </div>
      <Link
        href="/dashboard/research"
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition"
      >
        <FileText className="h-4 w-4" />
        Search companies to add
      </Link>
    </div>
  );
}

export function EmptyStateNoJudgments({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="bg-muted rounded-full p-5">
        <FileText className="text-muted-foreground h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h3 className="text-foreground text-lg font-semibold">
          No Judgments to Track
        </h3>
        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
          You have {count} {count === 1 ? "company" : "companies"} in your
          watchlist, but no reports have been generated yet. Generate a report
          to create trackable judgments.
        </p>
      </div>
    </div>
  );
}

export function EmptyStateAllNotDue() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="bg-muted rounded-full p-5">
        <Clock className="text-muted-foreground h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h3 className="text-foreground text-lg font-semibold">
          All Judgments Are Being Tracked
        </h3>
        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
          Your judgments have been logged. Verification will run when due. Check
          back after the scheduled dates — no changes will be fabricated before
          then.
        </p>
      </div>
    </div>
  );
}
