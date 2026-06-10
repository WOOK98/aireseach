import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

import { generateId } from "@workspace/shared/utils";

import { createInsertSchema, createSelectSchema } from "../lib/zod";
import { user } from "./auth";

import type * as z from "zod";

export const aiUsageLog = pgTable(
  "ai_usage_log",
  {
    id: text().primaryKey().$defaultFn(generateId),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    feature: text().notNull(), // 'chat' | 'report'
    model: text().notNull(),
    promptTokens: integer().notNull().default(0),
    completionTokens: integer().notNull().default(0),
    totalTokens: integer().notNull().default(0),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (t) => [
    index("ai_usage_log_userId_idx").on(t.userId),
    index("ai_usage_log_feature_idx").on(t.feature),
    index("ai_usage_log_createdAt_idx").on(t.createdAt),
  ],
);

export const insertAiUsageLogSchema = createInsertSchema(aiUsageLog);
export const selectAiUsageLogSchema = createSelectSchema(aiUsageLog);

export type InsertAiUsageLog = z.infer<typeof insertAiUsageLogSchema>;
export type SelectAiUsageLog = z.infer<typeof selectAiUsageLogSchema>;
