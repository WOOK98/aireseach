/**
 * AleaBit — PNG Renderer (#135)
 *
 * Converts bilingual HTML to 1600×900 PNG using Playwright.
 * Two independent images (zh-CN + en) sharing the same verified data.
 *
 * Browser is launched once per renderPngBriefCard() call and closed after.
 */

import { renderBilingualBriefCard } from "./bilingual-renderer";

import type { FinancialBriefCard } from "@workspace/shared/types/aleabit";

const PNG_WIDTH = 1600;
const PNG_HEIGHT = 900;

export interface BilingualPngResult {
  zhCn: Buffer;
  en: Buffer;
}

/**
 * Render HTML as a 1600×900 PNG using Playwright.
 */
export async function renderPngFromHtml(html: string): Promise<Buffer> {
  // Dynamic import — only loads Playwright when actually needed.
  const { chromium } = await import("playwright");

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: PNG_WIDTH, height: PNG_HEIGHT },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    const screenshot = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: PNG_WIDTH, height: PNG_HEIGHT },
    });

    await context.close();
    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}

/**
 * Render a FinancialBriefCard as bilingual PNGs (zh-CN + en).
 * Returns two 1600×900 PNG Buffers sharing the same verified data.
 */
export async function renderPngBriefCard(
  card: FinancialBriefCard,
): Promise<BilingualPngResult> {
  const zhHtml = renderBilingualBriefCard(card, "zh-CN");
  const enHtml = renderBilingualBriefCard(card, "en");

  const zhCn = await renderPngFromHtml(zhHtml);
  const en = await renderPngFromHtml(enHtml);

  return { zhCn, en };
}
