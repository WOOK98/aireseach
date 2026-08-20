"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Research PDF — 阅读器 + 标注页 (knife-2 slice 1)
 *
 * - react-pdf 渲染（SSR 关闭，worker 走 /pdf.worker.min.mjs 静态资源）
 * - 画笔 / 高亮 / 文字三种标注，坐标归一化落库
 * - fileUrl 是 1h 签名链接，不落盘不公开
 * - 文件名 / ticker / 页码等动态文本全部 notranslate
 */
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  Highlighter,
  Loader2,
  MousePointer2,
  PenLine,
  Trash2,
  Type,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@workspace/ui-web/badge";
import { Button, buttonVariants } from "@workspace/ui-web/button";
import { Skeleton } from "@workspace/ui-web/skeleton";

import { pathsConfig } from "~/config/paths";
import { PdfViewer } from "~/modules/pdfs/pdf-viewer";
import {
  useAnnotations,
  useCreateAnnotation,
  useDeleteAnnotation,
  useDeletePdf,
  usePatchPdf,
  usePdf,
} from "~/modules/pdfs/use-pdfs";

import type { AnnotationTool } from "~/modules/pdfs/annotation-layer";
import type { AnnotationPayload } from "~/modules/pdfs/use-pdfs";

const TOOLS: { id: AnnotationTool; label: string; icon: React.ReactNode }[] = [
  { id: "none", label: "浏览", icon: <MousePointer2 className="h-4 w-4" /> },
  { id: "pen", label: "画笔", icon: <PenLine className="h-4 w-4" /> },
  {
    id: "highlight",
    label: "高亮",
    icon: <Highlighter className="h-4 w-4" />,
  },
  { id: "text", label: "文字", icon: <Type className="h-4 w-4" /> },
];

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

export default function PdfDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { data: pdf, isLoading, isError, error } = usePdf(id);
  const annotationsQuery = useAnnotations(id);
  const createAnnotation = useCreateAnnotation(id);
  const deleteAnnotation = useDeleteAnnotation(id);
  const patchPdf = usePatchPdf(id);
  const deletePdf = useDeletePdf();

  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [tool, setTool] = useState<AnnotationTool>("none");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDocumentLoad = useCallback(
    (count: number) => {
      setNumPages(count);
      // Report page count once so list views can show it.
      if (pdf && pdf.pageCount !== count) {
        patchPdf.mutate({ pageCount: count });
      }
    },
    [pdf, patchPdf],
  );

  const handleCreate = useCallback(
    (payload: AnnotationPayload) => {
      createAnnotation.mutate(
        { page, payload },
        {
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : "标注保存失败"),
        },
      );
    },
    [createAnnotation, page],
  );

  const handleDeletePdf = async () => {
    if (!pdf) return;
    // Two-click confirm — PDF delete cascades annotations and is permanent.
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    setDeleting(true);
    try {
      await deletePdf.mutateAsync(pdf.id);
      toast.success("已删除");
      router.push(pathsConfig.dashboard.user.pdfs);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[70vh] w-full" />
      </div>
    );
  }

  if (isError || !pdf) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="text-destructive rounded-xl border p-6 text-sm">
          加载失败：{error instanceof Error ? error.message : "PDF 不存在"}
        </div>
        <Link
          href={pathsConfig.dashboard.user.pdfs}
          className={
            buttonVariants({ variant: "outline", size: "sm" }) +
            " mt-4 inline-flex"
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回列表
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={pathsConfig.dashboard.user.pdfs}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          PDF
        </Link>
        <FileText className="text-muted-foreground h-4 w-4" />
        <h1
          className="notranslate min-w-0 truncate text-lg font-semibold"
          translate="no"
        >
          {pdf.fileName}
        </h1>
        {pdf.ticker && (
          <Badge variant="secondary" className="notranslate">
            {pdf.ticker}
          </Badge>
        )}
        {pdf.reportPeriod && (
          <Badge variant="outline" className="notranslate">
            {pdf.reportPeriod}
          </Badge>
        )}
        <Button
          variant={confirmDelete ? "destructive" : "ghost"}
          size="sm"
          className={confirmDelete ? "ml-auto" : "text-destructive ml-auto"}
          onClick={() => void handleDeletePdf()}
          disabled={deleting}
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : confirmDelete ? (
            <span className="text-xs">确认删除？</span>
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Toolbar */}
      <div className="bg-muted/40 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2">
        <div className="flex gap-1">
          {TOOLS.map((t) => (
            <Button
              key={t.id}
              variant={tool === t.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setTool(t.id)}
            >
              {t.icon}
              <span className="ml-1 hidden sm:inline">{t.label}</span>
            </Button>
          ))}
        </div>

        <div className="bg-border mx-2 h-5 w-px" />

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="notranslate px-1 text-sm" translate="no">
            {page} / {numPages ?? "…"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={numPages !== null && page >= numPages}
            onClick={() =>
              setPage((p) => (numPages ? Math.min(numPages, p + 1) : p + 1))
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="bg-border mx-2 h-5 w-px" />

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={scale <= MIN_SCALE}
            onClick={() =>
              setScale((s) => Math.max(MIN_SCALE, +(s - 0.25).toFixed(2)))
            }
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="notranslate w-12 text-center text-sm" translate="no">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={scale >= MAX_SCALE}
            onClick={() =>
              setScale((s) => Math.min(MAX_SCALE, +(s + 0.25).toFixed(2)))
            }
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {createAnnotation.isPending && (
          <span className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            保存标注…
          </span>
        )}
      </div>

      {/* Viewer */}
      <PdfViewer
        fileUrl={pdf.fileUrl}
        page={page}
        scale={scale}
        tool={tool}
        annotations={annotationsQuery.data ?? []}
        onDocumentLoad={handleDocumentLoad}
        onCreateAnnotation={handleCreate}
        onDeleteAnnotation={(annotationId) => {
          const target = (annotationsQuery.data ?? []).find(
            (a) => a.id === annotationId,
          );
          deleteAnnotation.mutate(annotationId, {
            onError: (err) =>
              toast.error(err instanceof Error ? err.message : "删除标注失败"),
            onSuccess: () => {
              if (!target) return;
              // Undo: re-create the same payload (new id, same data).
              toast.success("标注已删除", {
                action: {
                  label: "撤销",
                  onClick: () =>
                    createAnnotation.mutate({
                      page: target.page,
                      payload: target.payload,
                    }),
                },
              });
            },
          });
        }}
      />

      <p className="text-muted-foreground text-xs">
        提示：点击标注选中后可删除；双击标注直接删除。标注随文档保存，仅自己可见。
      </p>
    </div>
  );
}
