"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * PDF viewer — dynamic wrapper (knife-2 slice 1)
 *
 * react-pdf / PDF.js is browser-only; never SSR it.
 */
import dynamic from "next/dynamic";

import { Skeleton } from "@workspace/ui-web/skeleton";

import type { PdfViewerInnerProps } from "./pdf-viewer-inner";

export const PdfViewer = dynamic<PdfViewerInnerProps>(
  () =>
    import("./pdf-viewer-inner").then((m) => ({
      default: m.PdfViewerInner,
    })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[70vh] w-full" />,
  },
);

export type { PdfViewerInnerProps as PdfViewerProps };
