import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { auth } from "@workspace/auth/server";
import { and, eq, sql } from "@workspace/db";
import { watchlist } from "@workspace/db/schema";
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
  );
