"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * PDF viewer — react-pdf wrapper (knife-2 slice 1)
 *
 * Loaded via next/dynamic ssr:false (PDF.js is browser-only).
 * The worker is served from /pdf.worker.min.mjs (static asset in
 * apps/web/public) — no CDN dependency, no extra chunk config.
 *
 * Redlines:
 * - fileUrl is a time-limited signed URL, never persisted.
 * - Page count is reported up once (onDocumentLoad) so the server row
 *   stays accurate; rendering itself is single-page (streams naturally
 *   for very large PDFs).
 * - All dynamic text (file name, page numbers) stays inside notranslate
 *   spans handled by the parent page.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";

import { AnnotationLayer, type AnnotationTool } from "./annotation-layer";

import type { AnnotationItem, AnnotationPayload } from "./use-pdfs";

// Worker served as a static asset — copied from pdfjs-dist at build time.
if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

export interface PdfViewerInnerProps {
  fileUrl: string;
  page: number;
  scale: number;
  tool: AnnotationTool;
  annotations: AnnotationItem[];
  onDocumentLoad: (numPages: number) => void;
  onCreateAnnotation: (payload: AnnotationPayload) => void;
  onDeleteAnnotation: (id: string) => void;
}

export function PdfViewerInner({
  fileUrl,
  page,
  scale,
  tool,
  annotations,
  onDocumentLoad,
  onCreateAnnotation,
  onDeleteAnnotation,
}: PdfViewerInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Track container width so the page renders crisp at any zoom.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => onDocumentLoad(numPages),
    [onDocumentLoad],
  );

  const pageAnnotations = annotations.filter((a) => a.page === page);

  return (
    <div ref={containerRef} className="w-full">
      <Document
        file={fileUrl}
        onLoadSuccess={handleLoadSuccess}
        loading={
          <div className="text-muted-foreground py-16 text-center text-sm">
            加载 PDF…
          </div>
        }
        error={
          <div className="text-destructive py-16 text-center text-sm">
            PDF 加载失败 — 链接可能已过期，请刷新重试。
          </div>
        }
      >
        {containerWidth > 0 && (
          <div className="relative mx-auto w-fit shadow-lg">
            <Page
              pageNumber={page}
              width={Math.min(containerWidth, 1200) * scale}
              renderTextLayer
              renderAnnotationLayer={false}
              loading={
                <div className="text-muted-foreground py-16 text-center text-sm">
                  渲染页面…
                </div>
              }
            />
            <AnnotationLayer
              annotations={pageAnnotations}
              tool={tool}
              onCreate={onCreateAnnotation}
              onDelete={onDeleteAnnotation}
            />
          </div>
        )}
      </Document>
    </div>
  );
}
