/**
 * L3 Ledger Verification Runner
 *
 * Fetches current financial data for due judgments, evaluates wrongIf
 * conditions using the deterministic rule engine, and writes verification
 * records. The only module with side effects.
 *
 * Four-state outcome: confirmed / invalidated / needs_manual_review / insufficient_data
 * Redline: NEVER auto-confirm when data is missing or wrongIf is unparseable.
 *
 * See: docs/product/L3-LEDGER-VERIFICATION-LOOP.md
 */

import { and, sql } from "@workspace/db";
import { ledgerJudgment, ledgerVerification } from "@workspace/db/schema";
import { db } from "@workspace/db/server";

import {
  cachedFetchYahooFinance,
  sanitizeFinancialMetrics,
} from "../report/data-sources";
import { verifyJudgment } from "./verifier";

import type { VerificationOutcome } from "./verifier";
import type { FinancialMetrics } from "@workspace/shared/types/report";

// ── Types ───────────────────────────────────────────────────────────────────

interface VerificationBatchResult {
  processed: number;
  confirmed: number;
  invalidated: number;
  needsManualReview: number;
  insufficientData: number;
  errors: number;
}

// ── Runner ──────────────────────────────────────────────────────────────────

/**
 * Run verification for all due, unverified judgments.
 *
 * @param opts.batchSize - max judgments to process per run (default 50)
 * @param opts.dryRun - if true, evaluate but don't write to DB
 */
export async function runVerificationBatch(
  opts: {
    batchSize?: number;
    dryRun?: boolean;
  } = {},
): Promise<VerificationBatchResult> {
  const batchSize = opts.batchSize ?? 50;
  const dryRun = opts.dryRun ?? false;

  const result: VerificationBatchResult = {
    processed: 0,
    confirmed: 0,
    invalidated: 0,
    needsManualReview: 0,
    insufficientData: 0,
    errors: 0,
  };

  // Step 1: Query due + unverified judgments
  const dueJudgments = await db
    .select()
    .from(ledgerJudgment)
    .where(
      and(
        // checkAfter null = immediate (eligible now)
        sql`(${ledgerJudgment.checkAfter} IS NULL OR ${ledgerJudgment.checkAfter} <= NOW())`,
        sql`NOT EXISTS (
          SELECT 1 FROM ${ledgerVerification}
          WHERE ${ledgerVerification.judgmentId} = ${ledgerJudgment.id}
          AND ${ledgerVerification.result} != 'pending'
        )`,
      ),
    )
    .limit(batchSize);

  if (dueJudgments.length === 0) return result;

  // Step 2: Group by ticker (minimize API calls)
  const byTicker = new Map<string, typeof dueJudgments>();
  for (const j of dueJudgments) {
    const existing = byTicker.get(j.ticker) ?? [];
    existing.push(j);
    byTicker.set(j.ticker, existing);
  }

  // Step 3: Process each ticker
  for (const [ticker, judgments] of byTicker) {
    let metrics: FinancialMetrics | null = null;

    // Fetch current data for this ticker
    try {
      const raw = await cachedFetchYahooFinance(ticker);
      const sanitized = sanitizeFinancialMetrics(raw);
      metrics = sanitized.metrics;
    } catch {
      // Data source unreachable → all judgments for this ticker = insufficient_data
      for (const j of judgments) {
        result.processed++;
        result.insufficientData++;
        if (!dryRun) {
          await writeVerification(j.id, {
            result: "insufficient_data",
            dataPoint: "Data source unreachable",
            evidenceUrl: "",
            notes: `Market data API failed for ${ticker}`,
          });
        }
      }
      continue;
    }

    // Step 4: Verify each judgment
    for (const j of judgments) {
      result.processed++;

      try {
        const outcome = verifyJudgment(j, metrics);
        const counter = {
          confirmed: () => result.confirmed++,
          invalidated: () => result.invalidated++,
          needs_manual_review: () => result.needsManualReview++,
          insufficient_data: () => result.insufficientData++,
        };
        counter[outcome.result]();

        if (!dryRun) {
          await writeVerification(j.id, outcome);
        }
      } catch (err) {
        result.errors++;
        // On error, write insufficient_data (never confirmed)
        if (!dryRun) {
          await writeVerification(j.id, {
            result: "insufficient_data",
            dataPoint: "Error during verification",
            evidenceUrl: "",
            notes: `Verification error: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }
    }
  }

  return result;
}

// ── DB write ────────────────────────────────────────────────────────────────

async function writeVerification(
  judgmentId: string,
  outcome: {
    result: VerificationOutcome;
    dataPoint: string;
    evidenceUrl: string;
    notes: string;
  },
): Promise<void> {
  await db.insert(ledgerVerification).values({
    judgmentId,
    result: outcome.result,
    dataPoint: outcome.dataPoint,
    evidenceUrl: outcome.evidenceUrl || null,
    notes: outcome.notes,
    verifiedAt: new Date(),
  });
}
