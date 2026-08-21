/**
 * pdf-extract unit tests (#162)
 *
 * Exercises the REAL pdfjs-dist parser against a minimal one-page PDF
 * fixture assembled in-code (offsets computed, valid xref) — no mocks,
 * so parser upgrades that break text extraction fail loudly here.
 */
import { describe, expect, it } from "vitest";

import {
  extractPdfText,
  MAX_EXTRACT_CHARS,
  MAX_EXTRACT_PAGES,
} from "../pdf-extract";

/**
 * Build a minimal valid single-page PDF containing `text` drawn with
 * Helvetica. Offsets are computed so the xref table is correct.
 */
function buildPdf(text: string): Uint8Array {
  const stream = `BT /F1 24 Tf 100 700 Td (${text}) Tj ET`;
  const objects = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>",
    `<</Length ${stream.length}>>\nstream\n${stream}\nendstream`,
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

describe("extractPdfText", () => {
  it("extracts text from a real PDF fixture", async () => {
    const bytes = buildPdf("Hello Evidence");
    const result = await extractPdfText(bytes);
    expect(result.pageCount).toBe(1);
    expect(result.truncated).toBe(false);
    expect(result.text).toContain("Hello Evidence");
  });

  it("returns empty text (not an error) for a textless page", async () => {
    // Page with no content stream operators at all.
    const pdf = [
      "%PDF-1.4\n",
      "1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n",
      "2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n",
      "3 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>\nendobj\n",
    ];
    let body = pdf.join("");
    const offsets = [9, body.indexOf("2 0 obj"), body.indexOf("3 0 obj")];
    const xrefStart = body.length;
    body += "xref\n0 4\n0000000000 65535 f \n";
    for (const offset of offsets) {
      body += `${offset.toString().padStart(10, "0")} 00000 n \n`;
    }
    body += `trailer\n<</Size 4/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;

    const result = await extractPdfText(new TextEncoder().encode(body));
    expect(result.text).toBe("");
    expect(result.truncated).toBe(false);
  });

  it("throws on garbage input (caller maps to extractionStatus failed)", async () => {
    await expect(
      extractPdfText(new TextEncoder().encode("not a pdf at all")),
    ).rejects.toThrow(/Invalid|parse|Unknown|Error/i);
  });

  it("caps are defined and sane", () => {
    expect(MAX_EXTRACT_PAGES).toBe(200);
    expect(MAX_EXTRACT_CHARS).toBe(500_000);
  });
});
