import crypto from "crypto";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

import { logger } from "@workspace/shared/logger";

import { imaKnowledgeDocument } from "../schema";
import { db } from "../server";

type ParsedDocument = {
  market: string;
  category: string;
  title: string;
  sourceName: string | null;
  documentType: string | null;
  documentDate: Date | null;
  relativePath: string;
  contentHash: string;
  content: string;
};

const DEFAULT_ROOT = path.resolve(process.cwd(), "../../knowledge/ima");

const normalizePath = (value: string) => value.split(path.sep).join("/");

const ensureTable = async () => {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "ima_knowledge_document" (
      "id" text PRIMARY KEY NOT NULL,
      "source" text DEFAULT 'ima' NOT NULL,
      "market" text NOT NULL,
      "category" text NOT NULL,
      "title" text NOT NULL,
      "source_name" text,
      "document_type" text,
      "document_date" timestamp,
      "relative_path" text NOT NULL,
      "content_hash" text NOT NULL,
      "content" text NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "ima_knowledge_document_relative_path_idx"
    ON "ima_knowledge_document" ("relative_path")
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "ima_knowledge_document_market_idx"
    ON "ima_knowledge_document" ("market")
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "ima_knowledge_document_category_idx"
    ON "ima_knowledge_document" ("category")
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "ima_knowledge_document_document_date_idx"
    ON "ima_knowledge_document" ("document_date")
  `);
};

const walkMarkdownFiles = (dir: string): string[] => {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
};

const parseSourceLine = (line: string) => {
  const clean = line.replace(/^>\s*/, "").trim();
  const sourceName = clean.match(/来源：([^|]+)/)?.[1]?.trim() ?? null;
  const dateText = clean.match(/日期：([^|]+)/)?.[1]?.trim();
  const typeText = clean.match(/类型：([^|]+)/)?.[1]?.trim() ?? null;
  const documentDate = dateText ? new Date(`${dateText}T00:00:00`) : null;

  return {
    sourceName,
    documentType: typeText,
    documentDate:
      documentDate && !Number.isNaN(documentDate.getTime())
        ? documentDate
        : null,
  };
};

const parseDocument = (root: string, filePath: string): ParsedDocument => {
  const relativePath = normalizePath(path.relative(root, filePath));
  const parts = relativePath.split("/");
  const market = parts[0] === "a-stocks" ? "a-stocks" : "us-stocks";
  const category =
    parts.length > 2 ? (parts[1] ?? "uncategorized") : "uncategorized";
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  const title =
    lines
      .find((line) => line.startsWith("# "))
      ?.replace(/^#\s+/, "")
      .trim() || path.basename(filePath, ".md");
  const source = parseSourceLine(
    lines.find((line) => line.startsWith("> 来源：")) ?? "",
  );
  const contentHash = crypto.createHash("sha256").update(raw).digest("hex");

  return {
    market,
    category,
    title,
    sourceName: source.sourceName,
    documentType: source.documentType,
    documentDate: source.documentDate,
    relativePath,
    contentHash,
    content: raw.slice(0, 120_000),
  };
};

const importBatch = async (documents: ParsedDocument[]) => {
  if (documents.length === 0) return;

  await db
    .insert(imaKnowledgeDocument)
    .values(documents)
    .onConflictDoUpdate({
      target: imaKnowledgeDocument.relativePath,
      set: {
        market: sql`excluded.market`,
        category: sql`excluded.category`,
        title: sql`excluded.title`,
        sourceName: sql`excluded.source_name`,
        documentType: sql`excluded.document_type`,
        documentDate: sql`excluded.document_date`,
        contentHash: sql`excluded.content_hash`,
        content: sql`excluded.content`,
        updatedAt: sql`now()`,
      },
    });
};

const main = async () => {
  const root = path.resolve(process.argv[2] ?? DEFAULT_ROOT);
  const files = walkMarkdownFiles(root);

  if (files.length === 0) {
    throw new Error(`No Markdown files found under ${root}`);
  }

  await ensureTable();

  let imported = 0;
  const batchSize = 100;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files
      .slice(i, i + batchSize)
      .map((filePath) => parseDocument(root, filePath));
    await importBatch(batch);
    imported += batch.length;
    logger.info(`Imported ${imported}/${files.length} ima documents`);
  }

  logger.info(`Ima knowledge import complete: ${imported} documents`);
};

void main()
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  })
  .then(() => {
    process.exit(0);
  });
