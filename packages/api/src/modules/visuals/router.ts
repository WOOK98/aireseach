/**
 * Data Visualization Atlas — API Router
 *
 * Endpoints:
 *   GET /api/visuals/manifest     — panel list, field schemas, lastRefreshed
 *   GET /api/visuals/verification-flow?days=30|90
 *   GET /api/visuals/tqs-distribution
 *   GET /api/visuals/fundamentals?ticker=SYMBOL
 *   GET /api/visuals/source-mix
 *
 * All dynamic numbers are returned with notranslate semantics.
 * No vendor names, env vars, or internal paths are exposed.
 */

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { auth } from "@workspace/auth/server";
import { and, desc, eq, gte } from "@workspace/db";
import { ledgerJudgment, ledgerVerification } from "@workspace/db/schema";
import { db } from "@workspace/db/server";

import { cachedFetchYahooFinance } from "../report/data-sources";
import {
  buildManifest,
  computeEvidenceSourceMix,
  computeTQSDistribution,
  computeVerificationFlow,
} from "./data-helpers";

const getUser = async (headers: Headers) => {
  const session = await auth.api.getSession({ headers });
  return session?.user ?? null;
};

export const visualsRouter = new Hono()
  // ── GET /manifest ──────────────────────────────────────────────────────────
  .get("/manifest", async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) {
      throw new HTTPException(401, { message: "Sign in required." });
    }

    // Find the most recent verification as lastRefreshed
    const [latest] = await db
      .select({ verifiedAt: ledgerVerification.verifiedAt })
      .from(ledgerVerification)
      .orderBy(desc(ledgerVerification.verifiedAt))
      .limit(1);

    const manifest = buildManifest(latest?.verifiedAt ?? null);
    return c.json(manifest);
  })

  // ── GET /verification-flow?days=30|90 ──────────────────────────────────────
  .get(
    "/verification-flow",
    zValidator(
      "query",
      z.object({
        days: z
          .enum(["30", "90"])
          .transform(Number)
          .pipe(z.union([z.literal(30), z.literal(90)])),
      }),
    ),
    async (c) => {
      const user = await getUser(c.req.raw.headers);
      if (!user) {
        throw new HTTPException(401, { message: "Sign in required." });
      }

      const { days } = c.req.valid("query");
      const now = new Date();
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      // Get verifications for this user's judgments in the period
      const verifications = await db
        .select({
          result: ledgerVerification.result,
          verifiedAt: ledgerVerification.verifiedAt,
        })
        .from(ledgerVerification)
        .innerJoin(
          ledgerJudgment,
          eq(ledgerVerification.judgmentId, ledgerJudgment.id),
        )
        .where(
          and(
            eq(ledgerJudgment.userId, user.id),
            gte(ledgerVerification.verifiedAt, cutoff),
          ),
        );

      const flow = computeVerificationFlow(verifications, days, now);
      return c.json(flow);
    },
  )

  // ── GET /tqs-distribution ──────────────────────────────────────────────────
  .get("/tqs-distribution", async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) {
      throw new HTTPException(401, { message: "Sign in required." });
    }

    const judgments = await db
      .select({ tqsTier: ledgerJudgment.tqsTier })
      .from(ledgerJudgment)
      .where(eq(ledgerJudgment.userId, user.id));

    const distribution = computeTQSDistribution(judgments);
    return c.json(distribution);
  })

  // ── GET /fundamentals?ticker=SYMBOL ────────────────────────────────────────
  .get(
    "/fundamentals",
    zValidator(
      "query",
      z.object({
        ticker: z
          .string()
          .trim()
          .min(1)
          .max(12)
          .transform((s) => s.toUpperCase()),
      }),
    ),
    async (c) => {
      const user = await getUser(c.req.raw.headers);
      if (!user) {
        throw new HTTPException(401, { message: "Sign in required." });
      }

      const { ticker } = c.req.valid("query");

      try {
        const metrics = await cachedFetchYahooFinance(ticker);

        return c.json({
          ticker: metrics.ticker,
          companyName: metrics.companyName,
          revenueHistory: metrics.revenueHistory,
          grossMarginHistory: metrics.grossMarginHistory,
          operatingMarginHistory: metrics.operatingMarginHistory,
          fcfHistory: metrics.fcfHistory,
        });
      } catch {
        // Honest empty state — no mock data, no fallback to 0
        return c.json({
          ticker,
          companyName: ticker,
          revenueHistory: [],
          grossMarginHistory: [],
          operatingMarginHistory: [],
          fcfHistory: [],
        });
      }
    },
  )

  // ── GET /source-mix ────────────────────────────────────────────────────────
  .get("/source-mix", async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) {
      throw new HTTPException(401, { message: "Sign in required." });
    }

    const judgments = await db
      .select({ source: ledgerJudgment.source })
      .from(ledgerJudgment)
      .where(eq(ledgerJudgment.userId, user.id));

    const mix = computeEvidenceSourceMix(judgments);
    return c.json(mix);
  });
