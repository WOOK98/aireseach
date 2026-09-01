/**
 * useAnnotations guard tests (#170, Codex re-review follow-up)
 *
 * The workspace right rail calls useAnnotations(selectedPdfId ?? "").
 * No PDF selected (or none uploaded) must NOT fire /api/pdfs//annotations.
 */
import { describe, expect, it } from "vitest";

import { annotationsQueryOptions, readError } from "./use-pdfs";

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

const respond = (status: number, body: string) =>
  new Response(body, { status });

describe("readError (#195)", () => {
  it("neutralizes 5xx JSON bodies carrying raw SQL", async () => {
    const res = respond(
      500,
      JSON.stringify({
        message: 'Failed query: select "id" from "research_pdfs" params: []',
      }),
    );
    const msg = await readError(res);
    expect(msg).toBe("Service temporarily unavailable. Try again later.");
    expect(msg).not.toContain("Failed query");
    expect(msg).not.toContain("research_pdfs");
  });

  it("neutralizes 5xx raw text bodies", async () => {
    const res = respond(
      503,
      'Failed query: insert into "research_pdfs" ... params: ["a.pdf"]',
    );
    const msg = await readError(res);
    expect(msg).not.toContain("Failed query");
    expect(msg).not.toContain("params");
  });

  it("passes through authored 4xx messages", async () => {
    const res = respond(400, JSON.stringify({ message: "Nothing to update." }));
    expect(await readError(res)).toBe("Nothing to update.");
  });
});
