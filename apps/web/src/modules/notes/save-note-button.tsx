"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Save generated article as a research note (#154).
 *
 * Failure is always explicit (toast with server message) — never silent.
 */
import { BookmarkCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@workspace/ui-web/button";

import { useSaveNote } from "./use-notes";

import type { ResearchArticle } from "@workspace/shared/types/article";

interface SaveNoteButtonProps {
  article: ResearchArticle;
  query: string;
  language?: "zh" | "en";
}

export function SaveNoteButton({
  article,
  query,
  language = "zh",
}: SaveNoteButtonProps) {
  const saveNote = useSaveNote();

  const handleSave = async () => {
    const title = `${article.entity.resolvedName} 研报笔记`;
    try {
      const saved = await saveNote.mutateAsync({
        title,
        article,
        sourceMeta: { query, language },
      });
      toast.success("已保存为研究笔记", {
        action: {
          label: "打开笔记",
          onClick: () => {
            window.location.href = `/dashboard/notes/${saved.id}`;
          },
        },
      });
    } catch (err) {
      toast.error(
        `保存失败: ${err instanceof Error ? err.message : "未知错误"}`,
      );
    }
  };

  return (
    <div className="flex items-center gap-2">
      {saveNote.isSuccess && saveNote.data ? (
        <Link
          href={`/dashboard/notes/${saveNote.data.id}`}
          className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors"
        >
          <BookmarkCheck className="h-3.5 w-3.5" />
          已保存 · 打开笔记
        </Link>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={saveNote.isPending}
          onClick={() => void handleSave()}
        >
          {saveNote.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <BookmarkCheck className="h-3.5 w-3.5" />
          )}
          {saveNote.isPending ? "保存中..." : "保存为笔记"}
        </Button>
      )}
    </div>
  );
}
