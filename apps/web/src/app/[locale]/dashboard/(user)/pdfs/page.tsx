"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Research PDFs — 列表/上传页 (knife-2 slice 1)
 *
 * User-scoped PDF library: upload, search, ticker filter, click-through
 * to the reader. File names / tickers are user content → notranslate.
 */
import { FileText, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@workspace/ui-web/badge";
import { Button } from "@workspace/ui-web/button";
import { Input } from "@workspace/ui-web/input";
import { Skeleton } from "@workspace/ui-web/skeleton";

import { pathsConfig } from "~/config/paths";
import { UploadPdfButton } from "~/modules/pdfs/upload-pdf-button";
import { usePdfs } from "~/modules/pdfs/use-pdfs";

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function PdfsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-xl border p-4">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export default function PdfsPage() {
  const [search, setSearch] = useState("");
  const [ticker, setTicker] = useState<string | null>(null);

  const pdfsQuery = usePdfs({
    q: search.trim() || undefined,
    ticker: ticker ?? undefined,
  });

  // Stable ticker facets from the unfiltered set.
  const allPdfs = usePdfs({});
  const tickers = useMemo(() => {
    const set = new Set<string>();
    for (const p of allPdfs.data ?? []) {
      if (p.ticker) set.add(p.ticker);
    }
    return Array.from(set).sort();
  }, [allPdfs.data]);

  const pdfs = pdfsQuery.data ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">PDF 文档</h1>
          <p className="text-muted-foreground text-sm">
            上传财报 / 研报 PDF，站内阅读并标注。仅自己可见。
          </p>
        </div>
        <UploadPdfButton />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索文件名 / 来源 / 全文..."
            className="pl-9"
          />
        </div>
        {tickers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant={ticker === null ? "default" : "outline"}
              size="sm"
              onClick={() => setTicker(null)}
            >
              全部
            </Button>
            {tickers.map((t) => (
              <Button
                key={t}
                variant={ticker === t ? "default" : "outline"}
                size="sm"
                className="notranslate"
                translate="no"
                onClick={() => setTicker(t)}
              >
                {t}
              </Button>
            ))}
          </div>
        )}
      </div>

      {pdfsQuery.isLoading ? (
        <PdfsSkeleton />
      ) : pdfsQuery.isError ? (
        // P0 (#195): neutral failure state — never render raw error text.
        <div className="text-destructive rounded-xl border p-6 text-sm">
          PDF 库暂时不可用，请稍后重试。
        </div>
      ) : pdfs.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          <FileText className="mx-auto mb-3 h-8 w-8 opacity-40" />
          还没有 PDF — 上传第一份财报或研报开始标注。
        </div>
      ) : (
        <div className="space-y-3">
          {pdfs.map((p) => (
            <Link
              key={p.id}
              href={pathsConfig.dashboard.user.pdf(p.id)}
              className="hover:bg-muted/50 block rounded-xl border p-4 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div
                  className="notranslate min-w-0 truncate font-medium"
                  translate="no"
                >
                  {p.fileName}
                </div>
                <div className="text-muted-foreground shrink-0 text-xs">
                  {formatSize(p.fileSizeBytes)}
                  {p.pageCount ? ` · ${p.pageCount} 页` : ""}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {p.ticker && (
                  <Badge variant="secondary" className="notranslate">
                    {p.ticker}
                  </Badge>
                )}
                {p.reportPeriod && (
                  <Badge variant="outline" className="notranslate">
                    {p.reportPeriod}
                  </Badge>
                )}
                {p.sourceLabel && (
                  <span
                    className="notranslate text-muted-foreground text-xs"
                    translate="no"
                  >
                    {p.sourceLabel}
                  </span>
                )}
                <span className="text-muted-foreground ml-auto text-xs">
                  {new Date(p.createdAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
