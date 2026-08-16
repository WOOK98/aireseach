/**
 * AleaBit — PNG serving endpoint (#135)
 *
 * GET /api/aleabit/png?id=<queueItemId>&locale=zh-CN|en
 *
 * Returns a 1600×900 PNG for the given queue item and locale.
 * Generates on-demand via @vercel/og (Satori) — serverless-compatible.
 *
 * Auth: session cookie via better-auth (same as dashboard).
 * No secret in URL. No Bearer token. Session cookie only.
 */

import { type NextRequest, NextResponse } from "next/server";

import { renderPngBriefCardLocale } from "@workspace/api/aleabit/png-renderer";
import { PersistentReviewQueue } from "@workspace/api/aleabit/queue-pg";

import { checkPngAuth } from "./auth";

import type { Locale } from "@workspace/api/aleabit/bilingual-renderer";

const VALID_LOCALES: Locale[] = ["zh-CN", "en"];

export async function GET(request: NextRequest) {
  // ── Session auth (cookie-based) ────────────────────────────────────────
  const authResult = await checkPngAuth(request);
  if (!authResult.ok) {
    return NextResponse.json(
      { ok: false, error: authResult.error },
      { status: authResult.status },
    );
  }

  // ── Params ─────────────────────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────
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

    const png = await renderPngBriefCardLocale(item.brief, locale);

    return new NextResponse(png as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(png.length),
        "Cache-Control": "private, no-store",
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
