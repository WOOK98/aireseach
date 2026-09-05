"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * SaveStatus — inline indicator for the document editor header.
 *
 * Phase 1: reliable writing. Three states:
 * - "saved" → muted check + time (e.g. "已保存 14:32")
 * - "saving" → spinning loader + "保存中…"
 * - "error" → red dot + "同步失败" + retry button
 */
import { Check, Loader2, RefreshCw } from "lucide-react";

import type { SaveStatus as SaveStatusType } from "~/modules/workspace/use-auto-save";

interface SaveStatusProps {
  status: SaveStatusType;
  lastSavedAt: Date | null;
  onRetry?: () => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SaveStatusIndicator({
  status,
  lastSavedAt,
  onRetry,
}: SaveStatusProps) {
  if (status === "saved") {
    return (
      <span className="text-muted-foreground flex items-center gap-1 text-xs">
        <Check className="size-3" />
        {lastSavedAt ? `已保存 ${formatTime(lastSavedAt)}` : "已保存"}
      </span>
    );
  }

  if (status === "saving") {
    return (
      <span className="text-muted-foreground flex items-center gap-1 text-xs">
        <Loader2 className="size-3 animate-spin" />
        保存中…
      </span>
    );
  }

  // error
  return (
    <span className="flex items-center gap-1 text-xs text-red-500">
      <span className="inline-block size-1.5 rounded-full bg-red-500" />
      同步失败
      {onRetry && (
        <button
          onClick={onRetry}
          className="hover:text-foreground ml-1 underline transition-colors"
        >
          <RefreshCw className="mr-0.5 inline size-3" />
          重试
        </button>
      )}
    </span>
  );
}
