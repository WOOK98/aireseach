import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { auth } from "@workspace/auth/server";
import { and, desc, eq, inArray, sql } from "@workspace/db";
import {
  ledgerJudgment,
  ledgerVerification,
  watchlist,
} from "@workspace/db/schema";
import { db } from "@workspace/db/server";

import { cachedResolveEntity } from "../report/data-sources";

const symbolSchema = z.string().trim().min(1).max(24);

let storageReady: Promise<void> | null = null;

const ensureStorage = () => {
  storageReady ??= db
    .execute(sql`
    CREATE TABLE IF NOT EXISTS "watchlist" (
      "id" text PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
      "symbol" text NOT NULL,
      "market" text NOT NULL,
      "note" text,
      "monitors" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "watchlist_user_symbol_idx"
      ON "watchlist" ("user_id", "symbol");

    CREATE INDEX IF NOT EXISTS "watchlist_userId_idx"
      ON "watchlist" ("user_id");
  `)
    .then(() => undefined);

  return storageReady;
};

const getUser = async (headers: Headers) => {
  const session = await auth.api.getSession({ headers });
  return session?.user ?? null;
};

const toWatchlistItem = (item: typeof watchlist.$inferSelect) => ({
  id: item.id,
  symbol: item.symbol,
  market: item.market,
  note: item.note,
  monitors: item.monitors,
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
});

// ── Feed types ────────────────────────────────────────────────────────────

interface FeedJudgment {
  id: string;
  judgment: string;
  keyNumber: string;
  wrongIf: string;
  metric: string | null;
  trigger: string | null;
  publishedAt: string;
  checkAfter: string | null;
}

interface FeedVerification {
  id: string;
  result: string;
  dataPoint: string | null;
  evidenceUrl: string | null;
  notes: string | null;
  verifiedAt: string;
}

export interface FeedItem {
  watchlistId: string;
  symbol: string;
  market: string;
  note: string | null;
  addedAt: string;
  // Judgment summary
  hasJudgments: boolean;
  totalJudgments: number;
  // Latest judgment detail
  latestJudgment: FeedJudgment | null;
  // Verification status
  verificationStatus:
    | "never_generated" // No judgments exist
    | "not_due" // Judgments exist but checkAfter is in the future
    | "awaiting" // Due for verification but no record yet
    | "confirmed"
    | "invalidated"
    | "needs_manual_review"
    | "insufficient_data";
  lastVerifiedAt: string | null;
  nextCheckAfter: string | null;
  // Latest verification detail
  latestVerification: FeedVerification | null;
  // All recent verifications for this ticker (for change count)
  recentVerificationCount: number;
}

// ── Feed endpoint ───────────────────────────────────────────────────────────

async function buildFeed(userId: string): Promise<FeedItem[]> {
  // 1. Get watchlist items
  const items = await db
    .select()
    .from(watchlist)
    .where(eq(watchlist.userId, userId))
    .orderBy(desc(watchlist.createdAt));

  if (items.length === 0) return [];

  const symbols = items.map((i) => i.symbol);

  // 2. Get all judgments for these tickers, grouped by ticker
  const judgments = await db
    .select()
    .from(ledgerJudgment)
    .where(
      and(
        eq(ledgerJudgment.userId, userId),
        inArray(ledgerJudgment.ticker, symbols),
      ),
    )
    .orderBy(desc(ledgerJudgment.publishedAt));

  // Group judgments by ticker
  const judgmentsByTicker = new Map<string, typeof judgments>();
  for (const j of judgments) {
    const existing = judgmentsByTicker.get(j.ticker) ?? [];
    existing.push(j);
    judgmentsByTicker.set(j.ticker, existing);
  }

  // 3. Get all verifications for these judgments
  const judgmentIds = judgments.map((j) => j.id);
  let verifications: Array<typeof ledgerVerification.$inferSelect> = [];
  if (judgmentIds.length > 0) {
    verifications = await db
      .select()
      .from(ledgerVerification)
      .where(inArray(ledgerVerification.judgmentId, judgmentIds))
      .orderBy(desc(ledgerVerification.verifiedAt));
  }

  // Group verifications by judgmentId
  const verificationsByJudgment = new Map<string, typeof verifications>();
  for (const v of verifications) {
    const existing = verificationsByJudgment.get(v.judgmentId) ?? [];
    existing.push(v);
    verificationsByJudgment.set(v.judgmentId, existing);
  }

  // 4. Build feed items
  const now = new Date();
  const feed: FeedItem[] = items.map((item) => {
    const tickerJudgments = judgmentsByTicker.get(item.symbol) ?? [];
    const hasJudgments = tickerJudgments.length > 0;
    const latestJudgment = tickerJudgments[0] ?? null;

    // Collect all verifications for this ticker's judgments
    const allVerifications = tickerJudgments.flatMap(
      (j) => verificationsByJudgment.get(j.id) ?? [],
    );
    const sortedVerifications = allVerifications.sort(
      (a, b) =>
        new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime(),
    );
    const latestV = sortedVerifications[0] ?? null;

    // Determine verification status
    let verificationStatus: FeedItem["verificationStatus"] = "never_generated";
    let nextCheckAfter: string | null = null;

    if (!hasJudgments) {
      verificationStatus = "never_generated";
    } else {
      // Find the earliest checkAfter that hasn't been verified yet
      const unverified = tickerJudgments.filter((j) => {
        const jVerifications = verificationsByJudgment.get(j.id) ?? [];
        return jVerifications.length === 0;
      });

      if (unverified.length > 0) {
        // Has unverified judgments
        const dueNow = unverified.filter(
          (j) => !j.checkAfter || new Date(j.checkAfter) <= now,
        );
        if (dueNow.length > 0) {
          verificationStatus = "awaiting";
        } else {
          // Not yet due — show the earliest checkAfter
          verificationStatus = "not_due";
          const dates = unverified
            .map((j) => j.checkAfter)
            .filter(Boolean)
            .map((d) => new Date(d).getTime());
          if (dates.length > 0) {
            nextCheckAfter = new Date(Math.min(...dates)).toISOString();
          }
        }
      } else if (latestV) {
        // All judgments have been verified — use latest result
        verificationStatus = latestV.result as FeedItem["verificationStatus"];
      }
    }

    // Count recent verifications (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentVerificationCount = sortedVerifications.filter(
      (v) => new Date(v.verifiedAt) >= thirtyDaysAgo,
    ).length;

    return {
      watchlistId: item.id,
      symbol: item.symbol,
      market: item.market,
      note: item.note,
      addedAt: item.createdAt.toISOString(),
      hasJudgments,
      totalJudgments: tickerJudgments.length,
      latestJudgment: latestJudgment
        ? {
            id: latestJudgment.id,
            judgment: latestJudgment.judgment,
            keyNumber: latestJudgment.keyNumber,
            wrongIf: latestJudgment.wrongIf,
            metric: latestJudgment.metric,
            trigger: latestJudgment.trigger,
            publishedAt: latestJudgment.publishedAt.toISOString(),
            checkAfter: latestJudgment.checkAfter?.toISOString() ?? null,
          }
        : null,
      verificationStatus,
      lastVerifiedAt: latestV?.verifiedAt.toISOString() ?? null,
      nextCheckAfter,
      latestVerification: latestV
        ? {
            id: latestV.id,
            result: latestV.result,
            dataPoint: latestV.dataPoint,
            evidenceUrl: latestV.evidenceUrl,
            notes: latestV.notes,
            verifiedAt: latestV.verifiedAt.toISOString(),
          }
        : null,
      recentVerificationCount,
    };
  });

  return feed;
}

export const watchlistRouter = new Hono()
  .get("/", async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) {
      return c.json({ ok: true, authenticated: false, items: [] });
    }

    await ensureStorage();

    const items = await db
      .select()
      .from(watchlist)
      .where(eq(watchlist.userId, user.id))
      .orderBy(watchlist.createdAt);

    return c.json({
      ok: true,
      authenticated: true,
      items: items.map(toWatchlistItem),
    });
  })
  .get(
    "/:symbol",
    zValidator("param", z.object({ symbol: symbolSchema })),
    async (c) => {
      const user = await getUser(c.req.raw.headers);
      if (!user) {
        return c.json({ ok: true, authenticated: false, item: null });
      }

      await ensureStorage();

      const symbol = c.req.valid("param").symbol.toUpperCase();
      const [item] = await db
        .select()
        .from(watchlist)
        .where(and(eq(watchlist.userId, user.id), eq(watchlist.symbol, symbol)))
        .limit(1);

      return c.json({
        ok: true,
        authenticated: true,
        item: item ? toWatchlistItem(item) : null,
      });
    },
  )
  .post(
    "/",
    zValidator(
      "json",
      z.object({
        symbol: symbolSchema,
        note: z.string().max(240).optional(),
        monitors: z.array(z.record(z.string(), z.unknown())).optional(),
      }),
    ),
    async (c) => {
      const user = await getUser(c.req.raw.headers);
      if (!user) throw new HTTPException(401, { message: "Sign in required." });

      await ensureStorage();

      const input = c.req.valid("json");
      const resolution = await cachedResolveEntity(input.symbol);
      if (!resolution.ok) {
        return c.json(
          { ok: false, message: "Resolve the company before saving it." },
          422,
        );
      }

      const values = {
        userId: user.id,
        symbol: resolution.ticker,
        market: resolution.exchange || "unknown",
        note: input.note,
        monitors: input.monitors ?? [],
        updatedAt: new Date(),
      };

      const [item] = await db
        .insert(watchlist)
        .values(values)
        .onConflictDoUpdate({
          target: [watchlist.userId, watchlist.symbol],
          set: values,
        })
        .returning();

      if (!item) {
        throw new HTTPException(500, { message: "Watchlist update failed." });
      }

      return c.json({ ok: true, item: toWatchlistItem(item) });
    },
  )
  .delete(
    "/:symbol",
    zValidator("param", z.object({ symbol: symbolSchema })),
    async (c) => {
      const user = await getUser(c.req.raw.headers);
      if (!user) throw new HTTPException(401, { message: "Sign in required." });

      await ensureStorage();

      const symbol = c.req.valid("param").symbol.toUpperCase();
      await db
        .delete(watchlist)
        .where(
          and(eq(watchlist.userId, user.id), eq(watchlist.symbol, symbol)),
        );

      return c.json({ ok: true });
    },
  )
  // ── GET /feed — enriched watchlist with judgment + verification data ──
  .get("/feed", async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) {
      return c.json({ ok: true, authenticated: false, items: [] });
    }

    await ensureStorage();

    const feed = await buildFeed(user.id);

    return c.json({
      ok: true,
      authenticated: true,
      items: feed,
    });
  });
