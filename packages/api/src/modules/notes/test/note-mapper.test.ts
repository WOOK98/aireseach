/**
 * Research Notes — note-mapper unit tests (#154)
 *
 * Covers:
 * - extractArticleFields: valid article → correct field extraction
 * - extractArticleFields: invalid payload → null (neutral 422 path)
 * - patchNoteInputSchema: strict mode rejects artifact/immutable keys
 * - toNoteListItem: artifact excluded, evidenceCount derived
 * - toNoteDetail: artifact included
 */
import { describe, expect, it } from "vitest";

import { VALID_ARTICLE } from "../../article/test/fixtures/article-fixture";
import {
  createNoteInputSchema,
  extractArticleFields,
  listNotesQuerySchema,
  patchNoteInputSchema,
  toNoteDetail,
  toNoteListItem,
} from "../note-mapper";

describe("extractArticleFields", () => {
  it("extracts fields from a valid article", () => {
    const fields = extractArticleFields(VALID_ARTICLE);

    expect(fields).not.toBeNull();
    expect(fields!.schemaVersion).toBe(1);
    expect(fields!.entityTicker).toBe("NVDA");
    expect(fields!.entityName).toBe("NVIDIA Corporation");
    expect(fields!.asOf).toBe(VALID_ARTICLE.entity.dataTimestamp);
    expect(fields!.evidenceIds.length).toBeGreaterThan(0);
    expect(fields!.artifact).toEqual(VALID_ARTICLE);
  });

  it("handles industry-mode article without ticker", () => {
    const industryArticle = {
      ...VALID_ARTICLE,
      entity: {
        ...VALID_ARTICLE.entity,
        ticker: undefined,
        mode: "industry",
      },
    };
    const fields = extractArticleFields(industryArticle);
    expect(fields).not.toBeNull();
    expect(fields!.entityTicker).toBeNull();
  });

  it("returns null for invalid payloads", () => {
    expect(extractArticleFields(null)).toBeNull();
    expect(extractArticleFields({})).toBeNull();
    expect(extractArticleFields({ schema_version: 1 })).toBeNull();
    expect(extractArticleFields("not an article")).toBeNull();
  });
});

describe("createNoteInputSchema", () => {
  it("accepts a minimal valid input", () => {
    const parsed = createNoteInputSchema.safeParse({
      title: "NVDA 研报",
      article: VALID_ARTICLE,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty title", () => {
    const parsed = createNoteInputSchema.safeParse({
      title: "  ",
      article: VALID_ARTICLE,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("patchNoteInputSchema — artifact immutability", () => {
  it("accepts editable fields", () => {
    const parsed = patchNoteInputSchema.safeParse({
      title: "新标题",
      summary: "新摘要",
      note: "我的批注",
      tags: ["NVDA", "AI"],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects artifact key (strict mode)", () => {
    const parsed = patchNoteInputSchema.safeParse({
      title: "新标题",
      artifact: { hacked: true },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects schemaVersion / asOf / evidenceIds keys", () => {
    for (const key of [
      "schemaVersion",
      "asOf",
      "evidenceIds",
      "entityTicker",
    ]) {
      const parsed = patchNoteInputSchema.safeParse({ [key]: "x" });
      expect(parsed.success).toBe(false);
    }
  });
});

describe("listNotesQuerySchema", () => {
  it("applies defaults", () => {
    const parsed = listNotesQuerySchema.parse({});
    expect(parsed.limit).toBe(20);
    expect(parsed.offset).toBe(0);
  });

  it("clamps limit above max", () => {
    const parsed = listNotesQuerySchema.safeParse({ limit: 999 });
    expect(parsed.success).toBe(false);
  });
});

describe("response mappers", () => {
  const row = {
    id: "n1",
    title: "NVDA 研报",
    summary: null,
    note: null,
    tags: ["NVDA"],
    entityTicker: "NVDA",
    entityName: "NVIDIA Corporation",
    artifact: VALID_ARTICLE,
    schemaVersion: 1,
    evidenceIds: ["E1", "E2", "E3"],
    asOf: "2026-08-10",
    sourceMeta: { query: "NVDA" },
    createdAt: new Date("2026-08-18T10:00:00Z"),
    updatedAt: new Date("2026-08-18T11:00:00Z"),
  };

  it("toNoteListItem excludes artifact and derives evidenceCount", () => {
    const item = toNoteListItem(row);
    expect(item).not.toHaveProperty("artifact");
    expect(item).not.toHaveProperty("evidenceIds");
    expect(item.evidenceCount).toBe(3);
    expect(item.asOf).toBe("2026-08-10");
    expect(item.createdAt).toBe("2026-08-18T10:00:00.000Z");
  });

  it("toNoteDetail includes artifact and evidenceIds", () => {
    const detail = toNoteDetail(row);
    expect(detail.artifact).toEqual(VALID_ARTICLE);
    expect(detail.evidenceIds).toEqual(["E1", "E2", "E3"]);
  });
});
