"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Note Publish Preview — workspace export/publish preview dialog (#190)
 *
 * Opens from the right inspector on a selected note object in
 * `/workspace?object=note:<id>`. Renders composed long-form output
 * (Markdown + HTML) with copy/download actions and an audit notice.
 *
 * No publishing side effects. No network calls. No provider/env/path leaks.
 *
 * REDLINES:
 * - explicit manual user actions only (copy / download)
 * - audit notice: "人工审阅后再发布"
 * - dynamic text wrapped in notranslate container
 * - no automatic publishing path
 */
import { Copy, Download, Eye, Loader2, Newspaper } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@workspace/ui-web/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui-web/dialog";

import {
  composeNotePublication,
  type NotePublicationInput,
} from "~/modules/workspace/note-publication";

import type { NoteDetail } from "~/modules/notes/use-notes";

type FormatMode = "markdown" | "html";

/** Convert NoteDetail to the composer's input shape. */
function toPublicationInput(note: NoteDetail): NotePublicationInput {
  return {
    title: note.title,
    summary: note.summary,
    note: note.note,
    tags: note.tags,
    kind: note.kind,
    entityTicker: note.entityTicker,
    entityName: note.entityName,
    evidenceCount: note.evidenceCount,
    asOf: note.asOf,
    artifact: note.artifact,
    liveBlocks: note.liveBlocks,
    blocks: note.blocks,
  };
}

function downloadBlob(content: string, mimeType: string, fileName: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function NotePublishPreview({ note }: { note: NoteDetail }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<FormatMode>("markdown");
  const [busy, setBusy] = useState<string | null>(null);

  const input = useMemo(() => toPublicationInput(note), [note]);
  const result = useMemo(
    () => (open ? composeNotePublication(input) : null),
    [open, input],
  );

  const copyText = useCallback(async (content: string, label: string) => {
    setBusy(label);
    try {
      await navigator.clipboard.writeText(content);
      toast.success(`${label}已复制到剪贴板`);
    } catch {
      toast.error("复制失败 — 浏览器拒绝了剪贴板访问，请改用下载");
    } finally {
      setBusy(null);
    }
  }, []);

  const copyHtml = useCallback(async () => {
    if (!result?.ok) return;
    setBusy("copy-html");
    try {
      const htmlBlob = new Blob([result.html], { type: "text/html" });
      const textBlob = new Blob([result.html], { type: "text/plain" });
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": htmlBlob,
          "text/plain": textBlob,
        }),
      ]);
      toast.success("HTML 已复制到剪贴板（富文本格式）");
    } catch {
      // Fallback to plain text copy
      try {
        await navigator.clipboard.writeText(result.html);
        toast.success("HTML 源码已复制到剪贴板");
      } catch {
        toast.error("复制失败 — 请改用下载");
      }
    } finally {
      setBusy(null);
    }
  }, [result]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Newspaper className="size-4" />
            发布预览
          </Button>
        }
      />
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle>发布预览</DialogTitle>
          <DialogDescription>
            <span className="notranslate" translate="no">
              {note.title}
            </span>{" "}
            — 本地生成，不执行任何发布操作。
          </DialogDescription>
        </DialogHeader>

        {/* Audit notice */}
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          ⚠️ 人工审阅后再发布 — 本预览在本地生成，不会执行任何自动发布操作。
          复制或下载后请自行审阅再使用。
        </div>

        {result && !result.ok && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            {result.reason}
          </div>
        )}

        {/* Format toggle */}
        <div className="flex items-center gap-1">
          <Button
            variant={mode === "markdown" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("markdown")}
          >
            Markdown
          </Button>
          <Button
            variant={mode === "html" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("html")}
          >
            <Eye className="mr-1 size-3" />
            HTML 预览
          </Button>
        </div>

        {/* Preview area */}
        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
          {mode === "markdown" ? (
            <pre
              className="notranslate p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap"
              translate="no"
            >
              {result?.ok ? result.markdown : "—"}
            </pre>
          ) : (
            <div
              className="notranslate prose prose-sm dark:prose-invert max-w-none p-4"
              translate="no"
              dangerouslySetInnerHTML={{
                __html: result?.ok ? result.html : "<p>—</p>",
              }}
            />
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {result?.ok && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={() => void copyText(result.markdown, "Markdown")}
              >
                {busy === "Markdown" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                复制 Markdown
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={() => void copyHtml()}
              >
                {busy === "copy-html" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                复制 HTML
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={() => {
                  setBusy("dl-md");
                  downloadBlob(
                    result.markdown,
                    "text/markdown;charset=utf-8",
                    `${result.fileStem}.md`,
                  );
                  toast.success("已下载 Markdown 文件");
                  setBusy(null);
                }}
              >
                {busy === "dl-md" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
                下载 .md
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={() => {
                  setBusy("dl-html");
                  downloadBlob(
                    result.html,
                    "text/html;charset=utf-8",
                    `${result.fileStem}.html`,
                  );
                  toast.success("已下载 HTML 文件");
                  setBusy(null);
                }}
              >
                {busy === "dl-html" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
                下载 .html
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
