"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Evidence Inbox — 手动证据收集箱 (#165)
 *
 * 粘贴文本 / 收藏 URL / X 帖子 → source 记录 → 一键转 draft note。
 * 复用 #117 EvidenceRef schema，convert 幂等。
 */
import {
  Archive,
  ArrowRight,
  AtSign,
  FileText,
  Globe,
  Link2,
  Loader2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@workspace/ui-web/badge";
import { Button } from "@workspace/ui-web/button";
import { Input } from "@workspace/ui-web/input";
import { Skeleton } from "@workspace/ui-web/skeleton";
import { Textarea } from "@workspace/ui-web/textarea";

import { pathsConfig } from "~/config/paths";
import { useInbox, useInboxMutations } from "~/modules/inbox/use-inbox";

import type { InboxItem, InboxSourceType } from "~/modules/inbox/use-inbox";

const TYPE_META: Record<
  InboxSourceType,
  { label: string; icon: typeof Globe }
> = {
  url: { label: "链接", icon: Link2 },
  paste: { label: "粘贴", icon: FileText },
  x_post: { label: "X 帖子", icon: AtSign },
};

const STATUS_FILTERS = [
  { key: "inbox", label: "待处理" },
  { key: "converted", label: "已转笔记" },
  { key: "archived", label: "已归档" },
] as const;

function CaptureForm() {
  const { create } = useInboxMutations();
  const [sourceType, setSourceType] = useState<InboxSourceType>("url");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [author, setAuthor] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [rawText, setRawText] = useState("");

  const canSubmit =
    title.trim().length > 0 &&
    (sourceType === "paste"
      ? rawText.trim().length > 0
      : url.trim().length > 0);

  async function handleSubmit() {
    try {
      await create.mutateAsync({
        sourceType,
        title: title.trim(),
        url: sourceType === "paste" ? null : url.trim() || null,
        author: author.trim() || null,
        publishedAt: publishedAt.trim() || null,
        rawText: sourceType === "paste" ? rawText.trim() : null,
      });
      toast.success("已收集到 Inbox");
      setTitle("");
      setUrl("");
      setAuthor("");
      setPublishedAt("");
      setRawText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex gap-1.5">
        {(Object.keys(TYPE_META) as InboxSourceType[]).map((t) => {
          const Meta = TYPE_META[t];
          return (
            <Button
              key={t}
              variant={sourceType === t ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSourceType(t)}
            >
              <Meta.icon className="mr-1 h-3 w-3" />
              {Meta.label}
            </Button>
          );
        })}
      </div>

      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="标题 / 这条材料的核心观点..."
        maxLength={200}
        className="notranslate"
        translate="no"
      />

      {sourceType !== "paste" && (
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={
            sourceType === "x_post" ? "https://x.com/..." : "https://..."
          }
          maxLength={2000}
          className="notranslate font-mono text-xs"
          translate="no"
        />
      )}

      {sourceType === "paste" && (
        <Textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="粘贴原文 / 摘录（最多 50000 字）"
          rows={5}
          maxLength={50000}
          className="notranslate text-xs"
          translate="no"
        />
      )}

      <div className="flex gap-2">
        <Input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="作者（可选）"
          maxLength={120}
          className="notranslate h-8 text-xs"
          translate="no"
        />
        <Input
          value={publishedAt}
          onChange={(e) => setPublishedAt(e.target.value)}
          placeholder="发布日期 YYYY-MM-DD（可选）"
          maxLength={40}
          className="notranslate h-8 font-mono text-xs"
          translate="no"
        />
      </div>

      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={!canSubmit || create.isPending}
      >
        {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        收集
      </Button>
    </div>
  );
}

function InboxRow({ item }: { item: InboxItem }) {
  const router = useRouter();
  const { convert, patch, remove } = useInboxMutations();
  const Meta = TYPE_META[item.sourceType];
  const busy = convert.isPending || patch.isPending || remove.isPending;

  async function handleConvert() {
    try {
      const r = await convert.mutateAsync(item.id);
      toast.success(
        r.alreadyConverted ? "已转换过，打开笔记" : "已转为研究笔记草稿",
      );
      router.push(pathsConfig.dashboard.user.note(r.noteId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "转换失败");
    }
  }

  async function handleArchive() {
    try {
      await patch.mutateAsync({ id: item.id, input: { status: "archived" } });
      toast.success("已归档");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "归档失败");
    }
  }

  async function handleDelete() {
    if (!window.confirm("确定删除这条收集？此操作不可恢复。")) return;
    try {
      await remove.mutateAsync(item.id);
      toast.success("已删除");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Meta.icon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            <p
              className="notranslate truncate text-sm font-semibold"
              translate="no"
            >
              {item.title}
            </p>
          </div>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="notranslate text-muted-foreground mt-1 block truncate font-mono text-[11px] hover:underline"
              translate="no"
            >
              {item.url}
            </a>
          )}
          {item.rawText && (
            <p
              className="notranslate text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed"
              translate="no"
            >
              {item.rawText}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">
              {TYPE_META[item.sourceType].label}
            </Badge>
            {item.author && (
              <span
                className="notranslate text-muted-foreground text-[10px]"
                translate="no"
              >
                {item.author}
              </span>
            )}
            {item.publishedAt && (
              <span
                className="notranslate text-muted-foreground font-mono text-[10px]"
                translate="no"
              >
                {item.publishedAt}
              </span>
            )}
            <span className="text-muted-foreground text-[10px]">
              收集于 {new Date(item.createdAt).toLocaleDateString("zh-CN")}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {item.status === "converted" && item.noteId ? (
            <Link href={pathsConfig.dashboard.user.note(item.noteId)}>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                查看笔记 <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          ) : item.status === "inbox" ? (
            <>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleConvert}
                disabled={busy}
              >
                {convert.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ArrowRight className="mr-1 h-3 w-3" />
                )}
                转笔记
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={handleArchive}
                disabled={busy}
                title="归档"
              >
                <Archive className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={handleDelete}
                disabled={busy}
                title="删除"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <Badge variant="secondary" className="text-[10px]">
              已归档
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const [status, setStatus] =
    useState<(typeof STATUS_FILTERS)[number]["key"]>("inbox");
  const inboxQuery = useInbox(status);
  const items = inboxQuery.data ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Evidence Inbox</h1>
        <p className="text-muted-foreground text-sm">
          手动收集研究材料（链接 / 粘贴 / X 帖子）→ 一键转为研究笔记草稿。
          证据引用复用统一 EvidenceRef 模型。
        </p>
      </div>

      <CaptureForm />

      <div className="flex gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.key}
            variant={status === f.key ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setStatus(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {inboxQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-xl border p-4">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : inboxQuery.isError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center dark:border-amber-900/60 dark:bg-amber-950/30">
          <p className="text-sm font-medium">加载失败</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {inboxQuery.error instanceof Error
              ? inboxQuery.error.message
              : "请稍后重试"}
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-16 text-center">
          <Globe className="text-muted-foreground mx-auto h-8 w-8" />
          <p className="mt-3 text-sm font-medium">
            {status === "inbox" ? "收集箱是空的" : "没有匹配的记录"}
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            用上方表单收集链接、粘贴摘录或 X 帖子，之后一键转为研究笔记草稿。
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <InboxRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
