"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Research Workspace Shell — right rail (#170)
 *
 * Three insert sources for the selected note:
 * 1. Evidence Inbox (inbox-sourced text → evidence_ref live block)
 * 2. PDF Annotations (highlight/text annotation → source_excerpt live block)
 * 3. Live Evidence (note artifact evidence → evidence_ref live block)
 *
 * All inserts go through POST /api/notes/:id/blocks — no new API surface.
 *
 * REDLINES:
 * - unverified ≠ no change: inbox-derived refs are born "unverified".
 * - pen / excerpt-less annotations honestly map to nothing — no fabricated
 *   excerpts.
 * - honest empty states for every section.
 * - dynamic source/date/ticker text uses notranslate.
 */
import { FileText, Inbox, Loader2, Plus, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@workspace/ui-web/badge";
import { Button } from "@workspace/ui-web/button";
import { Skeleton } from "@workspace/ui-web/skeleton";

import { useInbox } from "~/modules/inbox/use-inbox";
import {
  evidenceAlreadyBlocked,
  extractNoteEvidence,
} from "~/modules/notes/live-block-view";
import { insertLiveBlock } from "~/modules/notes/use-notes";
import {
  annotationIsInsertable,
  annotationToInsertInput,
  inboxItemToInsertInput,
} from "~/modules/notes/workspace-view";
import { useAnnotations, usePdfs } from "~/modules/pdfs/use-pdfs";

import type { NoteDetail } from "~/modules/notes/use-notes";

type RailTab = "inbox" | "pdf" | "blocks";

const TAB_ITEMS: { key: RailTab; label: string; icon: typeof Inbox }[] = [
  { key: "inbox", label: "收件箱", icon: Inbox },
  { key: "pdf", label: "PDF 批注", icon: FileText },
  { key: "blocks", label: "证据", icon: Zap },
];

// ── Inbox section ───────────────────────────────────────────────────────────

function InboxInsertSection({
  noteId,
  onInserted,
}: {
  noteId: string;
  onInserted: () => Promise<unknown>;
}) {
  const { data: items, isLoading } = useInbox("inbox");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleInsert(itemId: string) {
    const item = items?.find((i) => i.id === itemId);
    if (!item) return;
    setBusyId(itemId);
    try {
      await insertLiveBlock(noteId, inboxItemToInsertInput(item));
      toast.success("已添加");
      await onInserted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "添加失败");
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const inbox = items ?? [];
  if (inbox.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center">
        <Inbox className="text-muted-foreground mx-auto h-5 w-5" />
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
          收件箱为空
        </p>
        <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
          在 Inbox 页面添加网页剪藏或文本后，即可插入当前笔记
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {inbox.map((item) => (
        <div
          key={item.id}
          className="hover:border-primary/40 flex items-center justify-between gap-2 rounded-lg border p-2 text-xs transition-colors"
        >
          <div className="min-w-0 flex-1">
            <p className="notranslate line-clamp-2 font-medium" translate="no">
              {item.title}
            </p>
            <p className="text-muted-foreground mt-0.5">
              {item.author && (
                <span className="notranslate" translate="no">
                  {item.author}
                  {" · "}
                </span>
              )}
              <span className="notranslate font-mono" translate="no">
                {(item.publishedAt ?? item.createdAt).slice(0, 10)}
              </span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => handleInsert(item.id)}
            disabled={busyId === item.id}
          >
            {busyId === item.id ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Plus className="size-3" />
            )}
            插入
          </Button>
        </div>
      ))}
    </div>
  );
}

// ── PDF annotations section ─────────────────────────────────────────────────

function PdfAnnotationsSection({
  noteId,
  onInserted,
}: {
  noteId: string;
  onInserted: () => Promise<unknown>;
}) {
  const { data: pdfs, isLoading: pdfsLoading } = usePdfs({});
  const [selectedPdfId, setSelectedPdfId] = useState<string | null>(null);
  const { data: annotations, isLoading: annsLoading } = useAnnotations(
    selectedPdfId ?? "",
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const selectedPdf = pdfs?.find((p) => p.id === selectedPdfId);

  async function handleInsert(annotationId: string) {
    const ann = annotations?.find((a) => a.id === annotationId);
    if (!ann || !selectedPdf) return;
    const input = annotationToInsertInput(ann, selectedPdf);
    if (!input) return;
    setBusyId(annotationId);
    try {
      await insertLiveBlock(noteId, input);
      toast.success("已添加");
      await onInserted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "添加失败");
    } finally {
      setBusyId(null);
    }
  }

  if (pdfsLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const pdfList = pdfs ?? [];

  if (!selectedPdfId) {
    if (pdfList.length === 0) {
      return (
        <div className="rounded-lg border border-dashed p-4 text-center">
          <FileText className="text-muted-foreground mx-auto h-5 w-5" />
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            暂无 PDF 文档
          </p>
          <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
            在 PDF 页面上传研报并添加文字批注后，即可插入当前笔记
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs">选择一份 PDF：</p>
        {pdfList.map((pdf) => (
          <button
            key={pdf.id}
            type="button"
            onClick={() => setSelectedPdfId(pdf.id)}
            className="hover:bg-muted/60 flex w-full items-center gap-2 rounded-md border p-2 text-left text-xs transition-colors"
          >
            <FileText className="size-3.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="notranslate truncate font-medium" translate="no">
                {pdf.fileName}
              </p>
              {pdf.ticker && (
                <span
                  className="notranslate text-muted-foreground font-mono"
                  translate="no"
                >
                  {pdf.ticker}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  }

  // Show annotations for selected PDF
  const annList = annotations ?? [];
  const insertable = annList.filter(annotationIsInsertable);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setSelectedPdfId(null)}
        className="text-muted-foreground hover:text-foreground text-xs underline"
      >
        ← 返回 PDF 列表
      </button>
      <p className="text-xs font-medium">
        <span className="notranslate" translate="no">
          {selectedPdf?.fileName}
        </span>
        {selectedPdf?.ticker && (
          <>
            {" "}
            <span
              className="notranslate text-muted-foreground font-mono"
              translate="no"
            >
              {selectedPdf.ticker}
            </span>
          </>
        )}
      </p>

      {annsLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : insertable.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-center">
          <FileText className="text-muted-foreground mx-auto h-5 w-5" />
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            该 PDF 暂无可插入的文字批注
          </p>
          <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
            高亮需包含摘录文字 — 在 PDF 页面补一条文字批注即可
          </p>
        </div>
      ) : (
        insertable.map((ann) => (
          <div
            key={ann.id}
            className="hover:border-primary/40 flex items-start justify-between gap-2 rounded-lg border p-2 text-xs transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground">
                第 {ann.page} 页 ·{" "}
                <Badge variant="outline" className="text-[10px]">
                  {ann.kind === "highlight" ? "高亮" : "文字"}
                </Badge>
              </p>
              {ann.payload.kind === "highlight" && ann.payload.excerpt && (
                <p className="notranslate mt-0.5 line-clamp-2" translate="no">
                  {ann.payload.excerpt}
                </p>
              )}
              {ann.payload.kind === "text" && (
                <p className="notranslate mt-0.5 line-clamp-2" translate="no">
                  {ann.payload.text}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={() => handleInsert(ann.id)}
              disabled={busyId === ann.id}
            >
              {busyId === ann.id ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Plus className="size-3" />
              )}
              插入
            </Button>
          </div>
        ))
      )}
    </div>
  );
}

// ── Live evidence section (from note artifact) ──────────────────────────────

function LiveEvidenceSection({
  noteId,
  note,
  onInserted,
}: {
  noteId: string;
  note: NoteDetail;
  onInserted: () => Promise<unknown>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const blocks = note.liveBlocks ?? [];
  const evidence = extractNoteEvidence(note.artifact);
  const insertable = evidence.filter(
    (ev) => !evidenceAlreadyBlocked(blocks, ev.id),
  );

  async function handleInsert(evidenceId: string) {
    const entry = insertable.find((ev) => ev.id === evidenceId);
    if (!entry) return;
    setBusyId(evidenceId);
    try {
      await insertLiveBlock(noteId, {
        mode: "evidence_ref",
        evidenceRef: entry,
        sourceType: note.kind === "draft" ? "inbox" : "evidence",
      });
      toast.success("已添加");
      await onInserted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "添加失败");
    } finally {
      setBusyId(null);
    }
  }

  if (insertable.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center">
        <Zap className="text-muted-foreground mx-auto h-5 w-5" />
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
          没有可插入的证据
        </p>
        <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
          笔记证据已全部添加为 Live Block，或该笔记无证据
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {insertable.map((ev) => (
        <div
          key={ev.id}
          className="hover:border-primary/40 flex items-start justify-between gap-2 rounded-lg border p-2 text-xs transition-colors"
        >
          <div className="min-w-0 flex-1">
            <p className="notranslate line-clamp-2 font-medium" translate="no">
              {ev.claim}
            </p>
            <p className="text-muted-foreground mt-0.5">
              <span className="notranslate" translate="no">
                {ev.source}
              </span>{" "}
              ·{" "}
              <span className="notranslate font-mono" translate="no">
                {ev.date}
              </span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => handleInsert(ev.id)}
            disabled={busyId === ev.id}
          >
            {busyId === ev.id ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Plus className="size-3" />
            )}
            插入
          </Button>
        </div>
      ))}
    </div>
  );
}

// ── Right rail ──────────────────────────────────────────────────────────────

/**
 * Workspace right rail: insert sources for the selected note.
 *
 * When no note is selected, shows a disabled hint. On mobile the rail
 * renders below the center panel (visible at all times so the insert
 * flow works on small screens).
 */
export function WorkspaceRightRail({
  noteId,
  note,
  onInserted,
}: {
  noteId: string | null;
  note: NoteDetail | null;
  onInserted: () => Promise<unknown>;
}) {
  const [tab, setTab] = useState<RailTab>("inbox");

  return (
    <div className="bg-card flex h-full flex-col overflow-hidden rounded-xl border">
      {/* ── Panel header ── */}
      <div className="border-b px-3 py-2.5">
        <p className="text-sm font-medium">插入源</p>
        <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
          把收件箱 / PDF 批注 / 证据插入当前笔记
        </p>
      </div>

      {/* ── Segmented tab control ── */}
      <div className="border-b p-2">
        <div className="bg-muted flex rounded-lg p-0.5">
          {TAB_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                  tab === item.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto p-2.5">
        {!noteId ? (
          <div className="flex h-full flex-col items-center justify-center p-4 text-center">
            <Plus className="text-muted-foreground h-5 w-5" />
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              请先在左侧选择一篇笔记
            </p>
            <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
              选中后这里会显示可插入的收件箱、PDF 批注与证据
            </p>
          </div>
        ) : tab === "inbox" ? (
          <InboxInsertSection noteId={noteId} onInserted={onInserted} />
        ) : tab === "pdf" ? (
          <PdfAnnotationsSection noteId={noteId} onInserted={onInserted} />
        ) : note ? (
          <LiveEvidenceSection
            noteId={noteId}
            note={note}
            onInserted={onInserted}
          />
        ) : null}
      </div>
    </div>
  );
}
