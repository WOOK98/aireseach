/**
 * AleaBit — PNG serving endpoint (#135)
 *
 * GET /api/aleabit/png?id=<queueItemId>&locale=zh-CN|en
 *
 * Returns a 1600×900 PNG for the given queue item and locale.
 * Generates on-demand from the stored brief card (brief JSON column).
 * Caches with Content-Addressable hash for efficient re-fetching.
 *
 * No X write. No media upload. Pure review asset serving.
 */

import { type NextRequest, NextResponse } from "next/server";

import { renderBilingualBriefCard } from "@workspace/api/aleabit/bilingual-renderer";
import { renderPngFromHtml } from "@workspace/api/aleabit/png-renderer";
import { PersistentReviewQueue } from "@workspace/api/aleabit/queue-pg";

import type { Locale } from "@workspace/api/aleabit/bilingual-renderer";

const VALID_LOCALES: Locale[] = ["zh-CN", "en"];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const locale = (searchParams.get("locale") ?? "zh-CN") as Locale;

  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Missing required parameter: id" },
      { status: 400 },
    );
  }

  if (!VALID_LOCALES.includes(locale)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Invalid locale. Must be one of: ${VALID_LOCALES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  try {
    const queue = new PersistentReviewQueue();
    const item = await queue.get(id);

    if (!item) {
      return NextResponse.json(
        { ok: false, error: "Queue item not found." },
        { status: 404 },
      );
    }

    if (!item.brief) {
      return NextResponse.json(
        { ok: false, error: "No brief card on this item yet." },
        { status: 422 },
      );
    }

    const html = renderBilingualBriefCard(item.brief, locale);
    const png = await renderPngFromHtml(html);

    return new NextResponse(png as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(png.length),
        "Cache-Control": "public, max-age=3600",
        "X-Aleabit-Locale": locale,
        "X-Aleabit-Queue-Id": id,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "PNG generation failed." },
      { status: 500 },
    );
  }
}
