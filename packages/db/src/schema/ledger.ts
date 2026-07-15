import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { generateId } from "@workspace/shared/utils";

import { createInsertSchema, createSelectSchema } from "../lib/zod";
import { user } from "./auth";

import type * as z from "zod";

// ─── L3 Outcome Ledger ──────────────────────────────────────────────────────
// Each published report's top judgments are automatically logged.
// Verification records track whether each judgment held over time.
// This is the highest-defense asset: the audit trail that compounds.

/**
 * Schema version for the monitor JSON format.
 * Aligned with report monitorPanel.schema_version.
 */
export const LEDGER_SCHEMA_VERSION = 1;

/**
 * Verification result states.
 * - "confirmed": judgment held — data point still within tolerance
 * - "invalidated": judgment broke — data point breached trigger or wrongIf condition
 * - "pending": not yet due for verification (check_after in the future)
 * - "insufficient_data": cannot verify — source unavailable or data gap
 */
export type VerificationResult =
  | "confirmed"
  | "invalidated"
  | "pending"
  | "insufficient_data";

// ─── Judgment records ────────────────────────────────────────────────────────

export const ledgerJudgment = pgTable(
  "ledger_judgment",
  {
    id: text().primaryKey().$defaultFn(generateId),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Report linkage
    reportId: text().notNull(), // external report identifier (e.g. generated timestamp or DB id)
    ticker: text().notNull(),
    companyName: text().notNull(),
    // Judgment content — no target price / rating / position fields (red line)
    judgment: text().notNull(), // human-readable thesis statement
    keyNumber: text().notNull(), // the bound data point (e.g. "Gross Margin 74.9%")
    keyNumberValue: text(), // normalized numeric value as string for programmatic checks (optional)
    wrongIf: text().notNull(), // invalidation condition
    // Monitor metadata (from report monitorPanel)
    metric: text(), // the metric being monitored (e.g. "grossMargin")
    trigger: text(), // threshold that invalidates (e.g. "<65%")
    tolerance: text(), // acceptable deviation
    source: text(), // data source URL or provider
    freq: text(), // "Daily" | "Weekly" | "Quarterly" | "Event-driven"
    // Schema version — aligned with monitorPanel.schema_version
    schemaVersion: text().notNull().default(String(LEDGER_SCHEMA_VERSION)),
    // Timing
    publishedAt: timestamp().notNull(), // when the report was published
    checkAfter: timestamp(), // earliest verification time (null = immediate)
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp()
      .notNull()
      .$onUpdate(() => new Date())
      .defaultNow(),
  },
  (table) => [
    index("ledger_judgment_ticker_idx").on(table.ticker),
    index("ledger_judgment_userId_idx").on(table.userId),
    index("ledger_judgment_reportId_idx").on(table.reportId),
    index("ledger_judgment_publishedAt_idx").on(table.publishedAt),
    // Idempotency: same report + same judgment text = no duplicate insert
    uniqueIndex("ledger_judgment_report_judgment_idx").on(
      table.reportId,
      table.judgment,
    ),
  ],
);

// ─── Verification records ────────────────────────────────────────────────────

export const ledgerVerification = pgTable(
  "ledger_verification",
  {
    id: text().primaryKey().$defaultFn(generateId),
    judgmentId: text()
      .notNull()
      .references(() => ledgerJudgment.id, { onDelete: "cascade" }),
    // Verification outcome
    result: text().notNull(), // VerificationResult enum
    // Evidence
    dataPoint: text(), // observed value at verification time
    evidenceUrl: text(), // link to source data
    notes: text(), // free-text analyst note
    // Timing
    verifiedAt: timestamp().notNull(), // when the verification was performed
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    index("ledger_verification_judgmentId_idx").on(table.judgmentId),
    index("ledger_verification_verifiedAt_idx").on(table.verifiedAt),
    index("ledger_verification_result_idx").on(table.result),
  ],
);

// ─── Zod schemas ─────────────────────────────────────────────────────────────

export const insertLedgerJudgmentSchema = createInsertSchema(ledgerJudgment);
export const selectLedgerJudgmentSchema = createSelectSchema(ledgerJudgment);
export const insertLedgerVerificationSchema =
  createInsertSchema(ledgerVerification);
export const selectLedgerVerificationSchema =
  createSelectSchema(ledgerVerification);

export type InsertLedgerJudgment = z.infer<typeof insertLedgerJudgmentSchema>;
export type SelectLedgerJudgment = z.infer<typeof selectLedgerJudgmentSchema>;
export type InsertLedgerVerification = z.infer<
  typeof insertLedgerVerificationSchema
>;
export type SelectLedgerVerification = z.infer<
  typeof selectLedgerVerificationSchema
>;
