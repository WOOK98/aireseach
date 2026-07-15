import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { auth } from "@workspace/auth/server";
import { and, desc, eq, inArray } from "@workspace/db";
import { ledgerJudgment, ledgerVerification } from "@workspace/db/schema";
import { db } from "@workspace/db/server";

export const ledgerRoute = new Hono();

// ─── POST /api/ledger/judgments — 入账 ───────────────────────────────────────
const insertJudgmentSchema = z.object({
  reportId: z.string().min(1),
  ticker: z.string().min(1).max(10),
  companyName: z.string().min(1),
  judgment: z.string().min(1),
  keyNumber: z.string().min(1),
  keyNumberValue: z.string().optional(),
  wrongIf: z.string().min(1),
  metric: z.string().optional(),
  trigger: z.string().optional(),
  tolerance: z.string().optional(),
  source: z.string().optional(),
  freq: z.string().optional(),
  publishedAt: z.string().datetime(),
  checkAfter: z.string().datetime().optional(),
});

const insertBatchSchema = z.object({
  judgments: z.array(insertJudgmentSchema).min(1).max(10),
});

ledgerRoute.post(
  "/judgments",
  zValidator("json", insertBatchSchema),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const user = session?.user ?? null;
    if (!user)
      throw new HTTPException(401, { message: "Authentication required." });

    const { judgments } = c.req.valid("json");

    // Red line: reject 0.0% fallback numbers
    for (const j of judgments) {
      if (j.keyNumber === "0.0%" || j.keyNumber === "N/A") {
        throw new HTTPException(422, {
          message: `Rejected: keyNumber "${j.keyNumber}" is a fallback value. Ledger does not accept unverifiable numbers.`,
        });
      }
    }

    // Three-state insert: inserted / skippedDuplicates / errors
    const insertedRows: Array<typeof ledgerJudgment.$inferSelect> = [];
    let skippedDuplicates = 0;
    let errors = 0;

    for (const j of judgments) {
      try {
        const [row] = await db
          .insert(ledgerJudgment)
          .values({
            userId: user.id,
            reportId: j.reportId,
            ticker: j.ticker.toUpperCase(),
            companyName: j.companyName,
            judgment: j.judgment,
            keyNumber: j.keyNumber,
            keyNumberValue: j.keyNumberValue ?? null,
            wrongIf: j.wrongIf,
            metric: j.metric ?? null,
            trigger: j.trigger ?? null,
            tolerance: j.tolerance ?? null,
            source: j.source ?? null,
            freq: j.freq ?? null,
            publishedAt: new Date(j.publishedAt),
            checkAfter: j.checkAfter ? new Date(j.checkAfter) : null,
          })
          .onConflictDoNothing()
          .returning();
        if (row) {
          insertedRows.push(row);
        } else {
          // onConflictDoNothing returns empty on conflict — this is a duplicate
          skippedDuplicates++;
        }
      } catch (err) {
        errors++;
        console.error(
          `[ledger] Failed to insert judgment for report=${j.reportId} ticker=${j.ticker}:`,
          err,
        );
      }
    }

    return c.json({
      ok: true,
      inserted: insertedRows.length,
      skippedDuplicates,
      errors,
      judgments: insertedRows,
    });
  },
);

// ─── GET /api/ledger/judgments/:ticker — 按 entity 读取 ──────────────────────
ledgerRoute.get(
  "/judgments/:ticker",
  zValidator("param", z.object({ ticker: z.string().min(1).max(10) })),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const user = session?.user ?? null;
    if (!user)
      throw new HTTPException(401, { message: "Authentication required." });

    const { ticker } = c.req.valid("param");

    const rows = await db
      .select()
      .from(ledgerJudgment)
      .where(
        and(
          eq(ledgerJudgment.userId, user.id),
          eq(ledgerJudgment.ticker, ticker.toUpperCase()),
        ),
      )
      .orderBy(desc(ledgerJudgment.publishedAt));

    return c.json({ ok: true, ticker: ticker.toUpperCase(), judgments: rows });
  },
);

// ─── POST /api/ledger/verify — 核验 ──────────────────────────────────────────
const verifySchema = z.object({
  judgmentId: z.string().min(1),
  result: z.enum(["confirmed", "invalidated", "pending", "insufficient_data"]),
  dataPoint: z.string().optional(),
  evidenceUrl: z.string().url().optional(),
  notes: z.string().optional(),
  verifiedAt: z.string().datetime(),
});

ledgerRoute.post("/verify", zValidator("json", verifySchema), async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const user = session?.user ?? null;
  if (!user)
    throw new HTTPException(401, { message: "Authentication required." });

  const body = c.req.valid("json");

  // Verify the judgment belongs to this user
  const [judgment] = await db
    .select()
    .from(ledgerJudgment)
    .where(eq(ledgerJudgment.id, body.judgmentId))
    .limit(1);

  if (!judgment || judgment.userId !== user.id) {
    throw new HTTPException(404, { message: "Judgment not found." });
  }

  const [verification] = await db
    .insert(ledgerVerification)
    .values({
      judgmentId: body.judgmentId,
      result: body.result,
      dataPoint: body.dataPoint ?? null,
      evidenceUrl: body.evidenceUrl ?? null,
      notes: body.notes ?? null,
      verifiedAt: new Date(body.verifiedAt),
    })
    .returning();

  return c.json({ ok: true, verification });
});

// ─── GET /api/ledger/judgments/:ticker/history — 含核验记录 ──────────────────
ledgerRoute.get(
  "/judgments/:ticker/history",
  zValidator("param", z.object({ ticker: z.string().min(1).max(10) })),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const user = session?.user ?? null;
    if (!user)
      throw new HTTPException(401, { message: "Authentication required." });

    const { ticker } = c.req.valid("param");

    const judgments = await db
      .select()
      .from(ledgerJudgment)
      .where(
        and(
          eq(ledgerJudgment.userId, user.id),
          eq(ledgerJudgment.ticker, ticker.toUpperCase()),
        ),
      )
      .orderBy(desc(ledgerJudgment.publishedAt));

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
    const verificationMap = new Map<string, typeof verifications>();
    for (const v of verifications) {
      const existing = verificationMap.get(v.judgmentId) ?? [];
      existing.push(v);
      verificationMap.set(v.judgmentId, existing);
    }

    const history = judgments.map((j) => ({
      ...j,
      verifications: verificationMap.get(j.id) ?? [],
    }));

    return c.json({ ok: true, ticker: ticker.toUpperCase(), history });
  },
);
