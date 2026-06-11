import { and, desc, ilike, or, sql } from "@workspace/db";
import { imaKnowledgeDocument } from "@workspace/db/schema";
import { db } from "@workspace/db/server";

type ImaKnowledgeHit = {
  title: string;
  market: string;
  category: string;
  date: string | null;
  excerpt: string;
  relativePath: string;
};

const escapeLike = (value: string) => value.replaceAll(/[%_\\]/g, "\\$&");

const buildTerms = (query: string) =>
  Array.from(
    new Set(
      query
        .split(/[\s,;，；/]+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 2)
        .slice(0, 5),
    ),
  );

const cleanExcerpt = (content: string, query: string) => {
  const compact = content
    .replace(/^#\s+/gm, "")
    .replace(/^>\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  const index = compact.toLowerCase().indexOf(query.toLowerCase());
  const start = index >= 0 ? Math.max(0, index - 180) : 0;
  return compact.slice(start, start + 520);
};

export const searchImaKnowledge = async (
  query: string,
  options: { limit?: number; market?: string } = {},
): Promise<ImaKnowledgeHit[]> => {
  const terms = buildTerms(query);
  if (terms.length === 0) return [];

  const matches = terms.map((term) => {
    const pattern = `%${escapeLike(term)}%`;
    return or(
      ilike(imaKnowledgeDocument.title, pattern),
      ilike(imaKnowledgeDocument.content, pattern),
    );
  });

  try {
    const rows = await db
      .select({
        title: imaKnowledgeDocument.title,
        market: imaKnowledgeDocument.market,
        category: imaKnowledgeDocument.category,
        documentDate: imaKnowledgeDocument.documentDate,
        content: imaKnowledgeDocument.content,
        relativePath: imaKnowledgeDocument.relativePath,
      })
      .from(imaKnowledgeDocument)
      .where(
        and(
          options.market
            ? sql`${imaKnowledgeDocument.market} = ${options.market}`
            : undefined,
          or(...matches),
        ),
      )
      .orderBy(desc(imaKnowledgeDocument.documentDate))
      .limit(options.limit ?? 6);

    return rows.map((row) => ({
      title: row.title,
      market: row.market,
      category: row.category,
      date: row.documentDate?.toISOString().slice(0, 10) ?? null,
      excerpt: cleanExcerpt(row.content, terms[0] ?? query),
      relativePath: row.relativePath,
    }));
  } catch {
    return [];
  }
};

export const formatImaKnowledgeForPrompt = (hits: ImaKnowledgeHit[]) => {
  if (hits.length === 0) return "";

  return hits
    .map(
      (hit, index) =>
        `${index + 1}. ${hit.title}\nMarket: ${hit.market}; Category: ${hit.category}; Date: ${hit.date ?? "unknown"}; Source: ima/${hit.relativePath}\nExcerpt: ${hit.excerpt}`,
    )
    .join("\n\n");
};
