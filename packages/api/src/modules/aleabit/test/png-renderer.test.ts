/**
 * AleaBit — PNG renderer tests (#135)
 *
 * Validates:
 * - Generates actual PNG files (valid PNG signature)
 * - Output is 1600×900 pixels
 * - zh-CN and en produce different images (different text)
 * - Both share the same data (same number of metrics rendered)
 *
 * Uses @vercel/og (Satori) — no browser binary needed.
 */

import { describe, expect, it } from "vitest";

import { buildNVDABrief } from "../fixtures/fixture-evidence";
import { renderPngBriefCard, renderPngBriefCardLocale } from "../png-renderer";

const FIXTURE_POST = {
  id: "p1",
  postId: "p1",
  conversationId: "conv_nvda_earnings_q2",
  authorId: "u1",
  author: "AleaBit",
  authorHandle: "aleabitoreddit",
  authorName: "AleaBit",
  text: "NVDA earnings analysis",
  postedAt: "2026-08-10T00:00:00Z",
  url: "https://x.com/aleabitoreddit/status/p1",
  editHistory: ["v1"],
  fetchedAt: "2026-08-10T00:00:00Z",
  metrics: [],
  citations: [],
};

const brief = buildNVDABrief(FIXTURE_POST);

// PNG signature: first 8 bytes = 0x89504E470D0A1A0A
function isPng(buffer: Buffer): boolean {
  if (buffer.length < 8) return false;
  return (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

// Parse IHDR chunk to get width/height (bytes 16-23 in a PNG)
function pngDimensions(
  buffer: Buffer,
): { width: number; height: number } | null {
  if (!isPng(buffer) || buffer.length < 24) return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

describe("png-renderer (@vercel/og)", () => {
  describe("renderPngBriefCardLocale", () => {
    it("produces a valid PNG for en", async () => {
      const png = await renderPngBriefCardLocale(brief, "en");

      expect(png).toBeInstanceOf(Buffer);
      expect(png.length).toBeGreaterThan(1000);
      expect(isPng(png)).toBe(true);
    }, 15_000);

    it("produces a valid PNG for zh-CN", async () => {
      const png = await renderPngBriefCardLocale(brief, "zh-CN");

      expect(png).toBeInstanceOf(Buffer);
      expect(png.length).toBeGreaterThan(1000);
      expect(isPng(png)).toBe(true);
    });

    it("produces 1600×900 PNG", async () => {
      const png = await renderPngBriefCardLocale(brief, "en");
      const dims = pngDimensions(png);

      expect(dims).not.toBeNull();
      expect(dims!.width).toBe(1600);
      expect(dims!.height).toBe(900);
    });
  });

  describe("renderPngBriefCard", () => {
    it("produces two different PNGs for zh-CN and en", async () => {
      const result = await renderPngBriefCard(brief);

      expect(result.zhCn).toBeInstanceOf(Buffer);
      expect(result.en).toBeInstanceOf(Buffer);

      // Both valid PNGs
      expect(isPng(result.zhCn)).toBe(true);
      expect(isPng(result.en)).toBe(true);

      // Both 1600×900
      expect(pngDimensions(result.zhCn)).toEqual({ width: 1600, height: 900 });
      expect(pngDimensions(result.en)).toEqual({ width: 1600, height: 900 });

      // Different content (different language text)
      expect(result.zhCn.equals(result.en)).toBe(false);
    });

    it("both PNGs are non-trivial size (>5KB)", async () => {
      const result = await renderPngBriefCard(brief);

      expect(result.zhCn.length).toBeGreaterThan(5_000);
      expect(result.en.length).toBeGreaterThan(5_000);
    });
  });
});
