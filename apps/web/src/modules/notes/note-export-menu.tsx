"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Note Export — dropdown menu (#180)
 *
 * Copy / download the selected note as Markdown. Purely local: the
 * document is serialized in the browser — no API route, no external
 * write path, no publishing.
 *
 * UX states:
 * - blocked by compliance → error toast with neutral reason, no file
 * - clipboard denied → error toast pointing at the download fallback
 * - success → explicit toast
 */
import { Copy, Download, FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@workspace/ui-web/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui-web/dropdown-menu";

import { noteToMarkdown } from "~/modules/notes/note-export";

import type { NoteDetail } from "~/modules/notes/use-notes";

export function NoteExportMenu({ note }: { note: NoteDetail }) {
  const [busy, setBusy] = useState<"copy" | "download" | null>(null);

  function buildExport() {
    const result = noteToMarkdown(note);
    if (!result.ok) {
      toast.error(result.reason);
      return null;
    }
    return result;
  }

  async function handleCopy() {
    const result = buildExport();
    if (!result) return;
    setBusy("copy");
    try {
      await navigator.clipboard.writeText(result.markdown);
      toast.success("Markdown 已复制到剪贴板");
    } catch {
      toast.error("复制失败 — 浏览器拒绝了剪贴板访问，请改用下载");
    } finally {
      setBusy(null);
    }
  }

  function handleDownload() {
    const result = buildExport();
    if (!result) return;
    setBusy("download");
    try {
      const blob = new Blob([result.markdown], {
        type: "text/markdown;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("已下载 Markdown 文件");
    } catch {
      toast.error("下载失败 — 请重试或改用复制");
    } finally {
      setBusy(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" disabled={busy !== null}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileDown className="size-4" />
            )}
            导出
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => void handleCopy()}
          disabled={busy !== null}
        >
          {busy === "copy" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Copy className="size-3.5" />
          )}
          复制 Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownload} disabled={busy !== null}>
          {busy === "download" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          下载 .md 文件
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
