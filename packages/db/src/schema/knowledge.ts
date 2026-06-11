import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { generateId } from "@workspace/shared/utils";

import { createInsertSchema, createSelectSchema } from "../lib/zod";

import type * as z from "zod";

export const imaKnowledgeDocument = pgTable(
  "ima_knowledge_document",
  {
    id: text().primaryKey().$defaultFn(generateId),
    source: text().notNull().default("ima"),
    market: text().notNull(),
    category: text().notNull(),
    title: text().notNull(),
    sourceName: text(),
    documentType: text(),
    documentDate: timestamp(),
    relativePath: text().notNull(),
    contentHash: text().notNull(),
    content: text().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("ima_knowledge_document_relative_path_idx").on(t.relativePath),
    index("ima_knowledge_document_market_idx").on(t.market),
    index("ima_knowledge_document_category_idx").on(t.category),
    index("ima_knowledge_document_document_date_idx").on(t.documentDate),
  ],
);

export const insertImaKnowledgeDocumentSchema =
  createInsertSchema(imaKnowledgeDocument);
export const selectImaKnowledgeDocumentSchema =
  createSelectSchema(imaKnowledgeDocument);

export type InsertImaKnowledgeDocument = z.infer<
  typeof insertImaKnowledgeDocumentSchema
>;
export type SelectImaKnowledgeDocument = z.infer<
  typeof selectImaKnowledgeDocumentSchema
>;
