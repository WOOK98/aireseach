"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Research Note — 详情页 (#154)
 *
 * Standalone detail route. Delegates the detail view to the shared
 * NoteDetailView component (also used by the Research Workspace Shell #170).
 *
 * - artifact 不可变：ArticleReport 原样渲染（as_of 快照，不混 live 数据）
 * - 仅 title / summary / note 可编辑（PATCH）
 * - 快照语义显式标注，防 evidence drift
 */
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { Skeleton } from "@workspace/ui-web/skeleton";

import { pathsConfig } from "~/config/paths";
import { NoteDetailView } from "~/modules/notes/note-detail-view";
import { useNote } from "~/modules/notes/use-notes";

export default function NoteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const { data: note, isLoading, isError, error, refetch } = useNote(id);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (isError || !note) {
    return (
      <div className="mx-auto w-full max-w-4xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          {error instanceof Error ? error.message : "笔记不存在或无权访问"}
        </div>
        <Link
          href={pathsConfig.dashboard.user.notes}
          className="mt-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          <ArrowLeft className="size-4" /> 返回工作台
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <NoteDetailView
        note={note}
        refetch={refetch}
        onDeleted={() => router.push(pathsConfig.dashboard.user.notes)}
        backHref={pathsConfig.dashboard.user.notes}
        backLabel="工作台"
      />
    </div>
  );
}
