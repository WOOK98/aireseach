"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Research Note — reusable detail view (#170)
 *
 * Extracted from the standalone [id] page so the Research Workspace Shell
 * can embed the same detail content in its center panel. Both the
 * standalone route and the workspace shell render this component.
 *
 * REDLINES:
 * - artifact immutability: ArticleReport renders the as-of snapshot only.
 * - live blocks live outside the artifact: insert/refresh never rewrites
 *   the snapshot narrative.
 * - every dynamic ticker/source/date/period/value uses notranslate.
 */
import {
  Camera,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@workspace/ui-web/badge";
import { Button } from "@workspace/ui-web/button";
import { Input } from "@workspace/ui-web/input";
import { Textarea } from "@workspace/ui-web/textarea";

import { ArticleReport } from "~/components/article/ArticleReport";
import {
  blockMetaLabel,
  blockRefreshErrorLabel,
  canRefreshBlock,
  evidenceAlreadyBlocked,
  extractNoteEvidence,
  staleStateBadgeVariant,
  staleStateLabel,
} from "~/modules/notes/live-block-view";
import {
  deleteNote,
  insertLiveBlock,
  patchNote,
  refreshLiveBlock,
} from "~/modules/notes/use-notes";

import type { ResearchArticle } from "@workspace/shared/types/article";
import type { NoteDetail } from "~/modules/notes/use-notes";

// ── Draft artifact viewer (#165) ────────────────────────────────────────────

/** Provenance + evidence for inbox-sourced draft notes. */
export function DraftArtifact({
  artifact,
}: {
  artifact: NoteDetail["artifact"];
}) {
  if (!("kind" in artifact) || artifact.kind !== "draft") return null;
  const draft = artifact;
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">草稿 · 来自 Evidence Inbox</Badge>
        <span className="text-muted-foreground text-xs">
          叙事部分由你撰写 — 上方「我的批注」可直接编辑
        </span>
      </div>

      <div className="space-y-1.5 text-sm">
        <p className="font-medium">来源</p>
        <div className="text-muted-foreground space-y-1 text-xs">
          <p>
            类型：{" "}
            <span className="notranslate font-mono" translate="no">
              {draft.source.sourceType}
            </span>
          </p>
          {draft.source.url && (
            <p>
              链接：{" "}
              <a
                href={draft.source.url}
                target="_blank"
                rel="noreferrer"
                className="notranslate font-mono break-all text-blue-600 hover:underline dark:text-blue-400"
                translate="no"
              >
                {draft.source.url}
              </a>
            </p>
          )}
          {draft.source.author && (
            <p>
              作者：{" "}
              <span className="notranslate" translate="no">
                {draft.source.author}
              </span>
            </p>
          )}
          {draft.source.publishedAt && (
            <p>
              发布于：{" "}
              <span className="notranslate font-mono" translate="no">
                {draft.source.publishedAt}
              </span>
            </p>
          )}
        </div>
      </div>

      {draft.source.rawText && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">原文摘录</p>
          <pre
            className="notranslate bg-muted max-h-96 overflow-auto rounded-md p-3 text-xs leading-relaxed whitespace-pre-wrap"
            translate="no"
          >
            {draft.source.rawText}
          </pre>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-sm font-medium">
          证据引用（{draft.evidence.length} 条）
        </p>
        {draft.evidence.map((ev) => (
          <div key={ev.id} className="rounded-md border p-3 text-xs">
            <p className="notranslate font-medium" translate="no">
              {ev.claim}
            </p>
            <p className="text-muted-foreground mt-1">
              <span className="notranslate" translate="no">
                {ev.source}
              </span>{" "}
              ·{" "}
              <span className="notranslate font-mono" translate="no">
                {ev.date}
              </span>{" "}
              ·{" "}
              <Badge variant="outline" className="text-[10px]">
                {ev.confidence}
              </Badge>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Live Blocks section (#167) ──────────────────────────────────────────────

/**
 * Refreshable evidence blocks — outside the immutable artifact.
 * Refresh updates only the block; failed blocks show a neutral reason.
 */
export function LiveBlocksSection({
  note,
  onChanged,
}: {
  note: NoteDetail;
  onChanged: () => Promise<unknown>;
}) {
  const [busyBlockId, setBusyBlockId] = useState<string | null>(null);
  const [busyEvidenceId, setBusyEvidenceId] = useState<string | null>(null);

  const blocks = note.liveBlocks ?? [];
  const evidence = extractNoteEvidence(note.artifact);
  const insertable = evidence.filter(
    (ev) => !evidenceAlreadyBlocked(blocks, ev.id),
  );

  async function handleRefresh(blockId: string) {
    setBusyBlockId(blockId);
    try {
      const updated = await refreshLiveBlock(note.id, blockId);
      if (updated.staleState === "failed") {
        toast.error(blockRefreshErrorLabel(updated) ?? "刷新失败");
      } else if (updated.staleState === "manual_only") {
        toast.info("该来源不支持自动刷新（仅手动）");
      } else {
        toast.success("已刷新");
      }
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "刷新失败");
    } finally {
      setBusyBlockId(null);
    }
  }

  async function handleInsert(evidenceId: string) {
    const entry = insertable.find((ev) => ev.id === evidenceId);
    if (!entry) return;
    setBusyEvidenceId(evidenceId);
    try {
      await insertLiveBlock(note.id, {
        mode: "evidence_ref",
        evidenceRef: entry,
        sourceType: note.kind === "draft" ? "inbox" : "evidence",
      });
      toast.success("已添加 Live Block");
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "添加失败");
    } finally {
      setBusyEvidenceId(null);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Live Blocks（{blocks.length}）</p>
        <span className="text-muted-foreground text-xs">
          可刷新证据块 — 刷新只更新块本身，不改正文快照
        </span>
      </div>

      {blocks.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-xs">
          No live blocks yet
        </p>
      ) : (
        <div className="space-y-2">
          {blocks.map((block) => {
            const errorLabel = blockRefreshErrorLabel(block);
            return (
              <div key={block.id} className="rounded-md border p-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <p className="notranslate font-medium" translate="no">
                    {block.title}
                  </p>
                  <Badge
                    variant={staleStateBadgeVariant(block.staleState)}
                    className="shrink-0 text-[10px]"
                  >
                    {staleStateLabel(block.staleState)}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">
                  <span className="notranslate" translate="no">
                    {blockMetaLabel(block)}
                  </span>
                  {block.lastRefreshedAt && (
                    <>
                      {" · 上次刷新 "}
                      <span className="notranslate font-mono" translate="no">
                        {block.lastRefreshedAt.slice(0, 19).replace("T", " ")}
                      </span>
                    </>
                  )}
                </p>
                {block.type === "source_excerpt" && (
                  <pre
                    className="notranslate bg-muted mt-2 max-h-40 overflow-auto rounded-md p-2 leading-relaxed whitespace-pre-wrap"
                    translate="no"
                  >
                    {block.content.excerpt}
                  </pre>
                )}
                {errorLabel && (
                  <p className="mt-2 text-red-600 dark:text-red-400">
                    {errorLabel}
                  </p>
                )}
                <div className="mt-2 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRefresh(block.id)}
                    disabled={
                      busyBlockId === block.id || !canRefreshBlock(block)
                    }
                    title={
                      canRefreshBlock(block)
                        ? undefined
                        : "该来源不支持自动刷新（仅手动）"
                    }
                  >
                    {busyBlockId === block.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3" />
                    )}
                    刷新
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {insertable.length > 0 && (
        <div className="space-y-1.5 border-t pt-3">
          <p className="text-muted-foreground text-xs">
            从笔记证据添加（{insertable.length} 条可添加）
          </p>
          {insertable.map((ev) => (
            <div
              key={ev.id}
              className="flex items-center justify-between gap-2 rounded-md border border-dashed p-2 text-xs"
            >
              <p className="min-w-0 flex-1">
                <span
                  className="notranslate block truncate font-medium"
                  translate="no"
                >
                  {ev.claim}
                </span>
                <span className="text-muted-foreground">
                  <span className="notranslate" translate="no">
                    {ev.source}
                  </span>{" "}
                  ·{" "}
                  <span className="notranslate font-mono" translate="no">
                    {ev.date}
                  </span>
                </span>
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleInsert(ev.id)}
                disabled={busyEvidenceId === ev.id}
              >
                {busyEvidenceId === ev.id ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Plus className="size-3" />
                )}
                添加
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Note Detail View ────────────────────────────────────────────────────────

/**
 * Full note detail: editable meta, snapshot notice, artifact, live blocks.
 *
 * Props are callback-driven so the caller can supply its own navigation
 * and state (workspace shell vs standalone route page).
 */
export function NoteDetailView({
  note,
  refetch,
  onDeleted,
  showBackButton,
  backHref,
  backLabel,
}: {
  note: NoteDetail;
  refetch: () => Promise<unknown>;
  onDeleted?: () => void | Promise<void>;
  /** Render the back-navigation link in the header. Defaults to true. */
  showBackButton?: boolean;
  backHref?: string;
  backLabel?: string;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [userNote, setUserNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setTitle(note.title);
    setSummary(note.summary ?? "");
    setUserNote(note.note ?? "");
  }, [note]);

  const dirty =
    title !== note.title ||
    summary !== (note.summary ?? "") ||
    userNote !== (note.note ?? "");

  async function handleSave() {
    setSaving(true);
    try {
      await patchNote(note.id, {
        title: title.trim(),
        summary: summary.trim() || null,
        note: userNote.trim() || null,
      });
      toast.success("已保存");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("确定删除这篇笔记？此操作不可恢复。")) return;
    setDeleting(true);
    try {
      await deleteNote(note.id);
      toast.success("已删除");
      await onDeleted?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
      setDeleting(false);
    }
  }

  const _showBack = showBackButton !== false;
  const _backHref = backHref ?? "/dashboard/notes";
  const _backLabel = backLabel ?? "返回";

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        {_showBack && (
          <a
            href={_backHref}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
          >
            {_backLabel}
          </a>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            删除
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            保存修改
          </Button>
        </div>
      </div>

      {/* ── Editable meta ── */}
      <div className="space-y-3 rounded-lg border p-4">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="notranslate text-lg font-semibold"
          translate="no"
          maxLength={200}
        />
        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="摘要（可选）"
          rows={2}
          maxLength={2000}
        />
        <Textarea
          value={userNote}
          onChange={(e) => setUserNote(e.target.value)}
          placeholder="我的批注（可选）——你自己的判断、跟踪点、提醒"
          rows={3}
          maxLength={10000}
        />
        <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
          {note.entityTicker && (
            <span
              className="notranslate rounded-full border px-2 py-0.5 font-mono"
              translate="no"
            >
              {note.entityTicker}
            </span>
          )}
          {note.entityName && (
            <span className="notranslate" translate="no">
              {note.entityName}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <FileText className="size-3" />
            证据 {note.evidenceCount} 条
          </span>
          {note.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="notranslate"
              translate="no"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* ── Snapshot notice (evidence drift guard) ── */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
        <Camera className="mt-0.5 size-4 shrink-0" />
        <p>
          数据快照 ·{" "}
          <span className="notranslate font-mono" translate="no">
            {note.asOf}
          </span>
          ：以下为保存时的完整内容，不会随后续行情/数据变化。重新生成请回
          Research 页。
        </p>
      </div>

      {/* ── Immutable artifact ── */}
      {note.kind === "draft" ? (
        <DraftArtifact artifact={note.artifact} />
      ) : (
        <ArticleReport article={note.artifact as ResearchArticle} />
      )}

      {/* ── Live Blocks (#167) — refreshable, outside the artifact ── */}
      <LiveBlocksSection note={note} onChanged={refetch} />
    </div>
  );
}
