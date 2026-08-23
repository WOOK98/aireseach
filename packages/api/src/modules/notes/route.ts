/**
 * Research Notes MVP — API Route (#154)
 *
 *   POST   /api/notes        save a generated article as a note
 *   GET    /api/notes        list current user's notes (no artifact)
 *   GET    /api/notes/:id    full note incl. immutable artifact
 *   PATCH  /api/notes/:id    edit title / summary / note / tags ONLY
 *   DELETE /api/notes/:id    delete own note
 *   POST   /api/notes/:id/blocks                 insert a Live Block (#167)
 *   POST   /api/notes/:id/blocks/:blockId/refresh  refresh one block (#167)
 *
 * REDLINES:
 * - artifact immutability: PATCH schema is .strict() and contains no
 *   artifact/schemaVersion/evidenceIds/asOf/entity keys — unknown keys 400.
 * - live blocks live OUTSIDE the artifact: block insert/refresh only ever
 *   rewrites the live_blocks column, never the as-of snapshot narrative.
 * - refresh failure is block-level (failed + neutral reason), never a 500.
 * - user-scoped: every query filters on session user.id; cross-user ids 404
 *   (no existence leak).
 * - neutral errors: no stack / schema detail leakage in responses.
 */
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { auth } from "@workspace/auth/server";
import { and, desc, eq, ilike, or } from "@workspace/db";
import { researchNotes } from "@workspace/db/schema";
import { db } from "@workspace/db/server";
import { sanitizeLiveBlocks } from "@workspace/shared/schema/live-block";
import { generateId } from "@workspace/shared/utils";

import {
  applyRefreshOutcome,
  buildLiveBlock,
  insertLiveBlockInputSchema,
  MAX_LIVE_BLOCKS_PER_NOTE,
} from "./live-block-mapper";
import { refreshLiveBlock } from "./live-block-refresh";
import {
  createNoteInputSchema,
  extractArticleFields,
  listNotesQuerySchema,
  patchNoteInputSchema,
  toNoteDetail,
  toNoteListItem,
} from "./note-mapper";

const getUser = async (headers: Headers) => {
  const session = await auth.api.getSession({ headers });
  return session?.user ?? null;
};

const unauthorized = () => new HTTPException(401, { message: "Unauthorized" });
const notFound = () => new HTTPException(404, { message: "Note not found." });

export const notesRoute = new Hono()

  // ── Create ──────────────────────────────────────────────────────────────
  .post("/", zValidator("json", createNoteInputSchema), async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) throw unauthorized();

    const input = c.req.valid("json");
    const fields = extractArticleFields(input.article);
    if (!fields) {
      throw new HTTPException(422, {
        message: "Article payload failed validation.",
      });
    }

    const [row] = await db
      .insert(researchNotes)
      .values({
        userId: user.id,
        title: input.title,
        summary: input.summary ?? null,
        note: input.note ?? null,
        tags: input.tags ?? [],
        entityTicker: fields.entityTicker,
        entityName: fields.entityName,
        artifact: fields.artifact,
        schemaVersion: fields.schemaVersion,
        evidenceIds: fields.evidenceIds,
        asOf: fields.asOf,
        sourceMeta: input.sourceMeta ?? null,
      })
      .returning();

    if (!row) {
      throw new HTTPException(500, { message: "Failed to save note." });
    }

    return c.json({ note: toNoteDetail(row) }, 201);
  })

  // ── List (artifact excluded) ─────────────────────────────────────────────
  .get("/", zValidator("query", listNotesQuerySchema), async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) throw unauthorized();

    const { q, ticker, limit, offset } = c.req.valid("query");

    const conditions = [eq(researchNotes.userId, user.id)];
    if (ticker) {
      conditions.push(eq(researchNotes.entityTicker, ticker));
    }
    if (q) {
      const pattern = `%${q}%`;
      const search = or(
        ilike(researchNotes.title, pattern),
        ilike(researchNotes.summary, pattern),
        ilike(researchNotes.entityName, pattern),
      );
      if (search) conditions.push(search);
    }

    const rows = await db
      .select()
      .from(researchNotes)
      .where(and(...conditions))
      .orderBy(desc(researchNotes.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({ notes: rows.map(toNoteListItem) });
  })

  // ── Detail ───────────────────────────────────────────────────────────────
  .get("/:id", async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) throw unauthorized();

    const [row] = await db
      .select()
      .from(researchNotes)
      .where(
        and(
          eq(researchNotes.id, c.req.param("id")),
          eq(researchNotes.userId, user.id),
        ),
      )
      .limit(1);

    if (!row) throw notFound();
    return c.json({ note: toNoteDetail(row) });
  })

  // ── Patch (editable fields only; artifact immutable) ─────────────────────
  .patch("/:id", zValidator("json", patchNoteInputSchema), async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) throw unauthorized();

    const patch = c.req.valid("json");
    if (Object.keys(patch).length === 0) {
      throw new HTTPException(400, { message: "Nothing to update." });
    }

    const [row] = await db
      .update(researchNotes)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(researchNotes.id, c.req.param("id")),
          eq(researchNotes.userId, user.id),
        ),
      )
      .returning();

    if (!row) throw notFound();
    return c.json({ note: toNoteDetail(row) });
  })

  // ── Delete ───────────────────────────────────────────────────────────────
  .delete("/:id", async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) throw unauthorized();

    const [row] = await db
      .delete(researchNotes)
      .where(
        and(
          eq(researchNotes.id, c.req.param("id")),
          eq(researchNotes.userId, user.id),
        ),
      )
      .returning({ id: researchNotes.id });

    if (!row) throw notFound();
    return c.json({ ok: true });
  })

  // ── Live Blocks: insert (#167) ─────────────────────────────────────────
  .post(
    "/:id/blocks",
    zValidator("json", insertLiveBlockInputSchema),
    async (c) => {
      const user = await getUser(c.req.raw.headers);
      if (!user) throw unauthorized();

      const [row] = await db
        .select()
        .from(researchNotes)
        .where(
          and(
            eq(researchNotes.id, c.req.param("id")),
            eq(researchNotes.userId, user.id),
          ),
        )
        .limit(1);

      if (!row) throw notFound();

      const existing = sanitizeLiveBlocks(row.liveBlocks);
      if (existing.length >= MAX_LIVE_BLOCKS_PER_NOTE) {
        throw new HTTPException(400, {
          message: `Live block limit reached (${MAX_LIVE_BLOCKS_PER_NOTE}).`,
        });
      }

      const block = buildLiveBlock(c.req.valid("json"), {
        generateId,
        now: () => new Date(),
      });
      if (!block) {
        throw new HTTPException(422, { message: "Invalid live block." });
      }

      const [updated] = await db
        .update(researchNotes)
        // live_blocks ONLY — the immutable artifact is never rewritten.
        .set({ liveBlocks: [...existing, block], updatedAt: new Date() })
        .where(
          and(eq(researchNotes.id, row.id), eq(researchNotes.userId, user.id)),
        )
        .returning();

      if (!updated) throw notFound();
      return c.json({ block }, 201);
    },
  )

  // ── Live Blocks: manual refresh (#167) ─────────────────────────────────
  // Updates ONLY the block's staleState / lastRefreshedAt / refreshError.
  // The note narrative and the block's captured content stay untouched.
  .post("/:id/blocks/:blockId/refresh", async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) throw unauthorized();

    const [row] = await db
      .select()
      .from(researchNotes)
      .where(
        and(
          eq(researchNotes.id, c.req.param("id")),
          eq(researchNotes.userId, user.id),
        ),
      )
      .limit(1);

    if (!row) throw notFound();

    const blocks = sanitizeLiveBlocks(row.liveBlocks);
    const blockId = c.req.param("blockId");
    const index = blocks.findIndex((b) => b.id === blockId);
    const target = index >= 0 ? blocks[index] : undefined;
    if (!target) {
      throw new HTTPException(404, { message: "Live block not found." });
    }

    // Refresher never throws — failure degrades to block-level `failed`.
    const outcome = await refreshLiveBlock(target);
    const refreshed = applyRefreshOutcome(target, outcome);
    const next = blocks.slice();
    next[index] = refreshed;

    const [updated] = await db
      .update(researchNotes)
      .set({ liveBlocks: next, updatedAt: new Date() })
      .where(
        and(eq(researchNotes.id, row.id), eq(researchNotes.userId, user.id)),
      )
      .returning();

    if (!updated) throw notFound();
    return c.json({ block: refreshed });
  });

export type NotesRoute = typeof notesRoute;
