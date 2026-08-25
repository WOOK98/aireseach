/**
 * useAnnotations guard tests (#170, Codex re-review follow-up)
 *
 * The workspace right rail calls useAnnotations(selectedPdfId ?? "").
 * No PDF selected (or none uploaded) must NOT fire /api/pdfs//annotations.
 */
import { describe, expect, it } from "vitest";

import { annotationsQueryOptions } from "./use-pdfs";

describe("annotationsQueryOptions", () => {
  it("is disabled for an empty pdfId (no-PDF workspace state)", () => {
    const opts = annotationsQueryOptions("");
    expect(opts.enabled).toBe(false);
    expect(opts.queryKey).toEqual(["pdf-annotations", ""]);
  });

  it("is enabled for a real pdfId", () => {
    const opts = annotationsQueryOptions("pdf_1");
    expect(opts.enabled).toBe(true);
    expect(opts.queryKey).toEqual(["pdf-annotations", "pdf_1"]);
  });
});
