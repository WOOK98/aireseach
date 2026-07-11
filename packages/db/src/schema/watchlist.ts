import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { generateId } from "@workspace/shared/utils";

import { createInsertSchema, createSelectSchema } from "../lib/zod";
import { user } from "./auth";

import type * as z from "zod";

export const watchlist = pgTable(
  "watchlist",
  {
    id: text().primaryKey().$defaultFn(generateId),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    symbol: text().notNull(),
    market: text().notNull(),
    note: text(),
    monitors: jsonb().$type<Record<string, unknown>[]>().notNull().default([]),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp()
      .notNull()
      .$onUpdate(() => new Date())
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("watchlist_user_symbol_idx").on(table.userId, table.symbol),
    index("watchlist_userId_idx").on(table.userId),
  ],
);

export const insertWatchlistSchema = createInsertSchema(watchlist);
export const selectWatchlistSchema = createSelectSchema(watchlist);

export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type SelectWatchlist = z.infer<typeof selectWatchlistSchema>;
