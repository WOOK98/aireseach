/**
 * Evidence Inbox — API Route (#165)
 *
 *   POST   /api/inbox            capture a url/paste/x_post item
 *   GET    /api/inbox            list current user's items (status filter)
 *   GET    /api/inbox/:id        item detail
 *   PATCH  /api/inbox/:id        edit provenance fields / archive
 *   POST   /api/inbox/:id/convert  item → draft research note (idempotent)
 *   DELETE /api/inbox/:id        delete (only before conversion)
 *
 * REDLINES:
 * - user-scoped: every query filters on session user.id; cross-user ids 404
 *   (no existence leak).
 * - convert reuses #117 evidence schema (see inbox-mapper) and writes an
 *   IMMUTABLE draft artifact — PATCH can never touch artifact fields.
 * - convert is idempotent: an already-converted item returns the existing
 *   note instead of creating a duplicate.
 * - url idempotency: userId+url unique index; a duplicate url maps to 409.
 * - neutral errors: no stack / schema detail leakage in responses.
 */
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { auth } from "@workspace/auth/server";
import { and, desc, eq } from "@workspace/db";
import { evidenceInbox, researchNotes } from "@workspace/db/schema";
import { db } from "@workspace/db/server";

import {
  buildDraftArtifact,
  createInboxItemInputSchema,
  evidenceIdForItem,
  listInboxQuerySchema,
  patchInboxItemInputSchema,
  toInboxItem,
} from "./inbox-mapper";

const getUser = async (headers: Headers) => {
  const session = await auth.api.getSession({ headers });
  return session?.user ?? null;
};

const unauthorized = () => new HTTPException(401, { message: "Unauthorized" });
const notFound = () => new HTTPException(404, { message: "Item not found." });

/** Fetch a user-scoped inbox row or throw 404. */
async function getOwnItem(itemId: string, userId: string) {
  const [row] = await db
    .select()
    .from(evidenceInbox)
    .where(and(eq(evidenceInbox.id, itemId), eq(evidenceInbox.userId, userId)))
    .limit(1);
  if (!row) throw notFound();
  return row;
}

export const inboxRoute = new Hono()

  // ── Create ──────────────────────────────────────────────────────────────
  .post("/", zValidator("json", createInboxItemInputSchema), async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) throw unauthorized();

    const input = c.req.valid("json");

    let row;
    try {
      [row] = await db
        .insert(evidenceInbox)
        .values({
          userId: user.id,
          sourceType: input.sourceType,
          title: input.title,
          url: input.url ?? null,
          author: input.author ?? null,
          publishedAt: input.publishedAt ?? null,
          rawText: input.rawText ?? null,
        })
        .returning();
    } catch {
      // userId+url unique violation → idempotent conflict, not a 500
      throw new HTTPException(409, {
        message: "This URL is already in your inbox.",
      });
    }

    if (!row) {
      throw new HTTPException(500, { message: "Failed to save item." });
    }

    return c.json({ item: toInboxItem(row) }, 201);
  })

  // ── List ─────────────────────────────────────────────────────────────────
  .get("/", zValidator("query", listInboxQuerySchema), async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) throw unauthorized();

    const { status, limit, offset } = c.req.valid("query");

    const conditions = [eq(evidenceInbox.userId, user.id)];
    if (status) conditions.push(eq(evidenceInbox.status, status));

    const rows = await db
      .select()
      .from(evidenceInbox)
      .where(and(...conditions))
      .orderBy(desc(evidenceInbox.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({ items: rows.map(toInboxItem) });
  })

  // ── Detail ───────────────────────────────────────────────────────────────
  .get("/:id", async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) throw unauthorized();

    const row = await getOwnItem(c.req.param("id"), user.id);
    return c.json({ item: toInboxItem(row) });
  })

  // ── Patch (provenance fields / archive only) ─────────────────────────────
  .patch("/:id", zValidator("json", patchInboxItemInputSchema), async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) throw unauthorized();

    const patch = c.req.valid("json");
    if (Object.keys(patch).length === 0) {
      throw new HTTPException(400, { message: "Nothing to update." });
    }

    const itemId = c.req.param("id");
    await getOwnItem(itemId, user.id);

    const [row] = await db
      .update(evidenceInbox)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(eq(evidenceInbox.id, itemId), eq(evidenceInbox.userId, user.id)),
      )
      .returning();

    if (!row) throw notFound();
    return c.json({ item: toInboxItem(row) });
  })

  // ── Convert → draft research note (idempotent) ──────────────────────────
  .post("/:id/convert", async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) throw unauthorized();

    const item = await getOwnItem(c.req.param("id"), user.id);

    // Idempotent: already converted → return the existing note reference.
    if (item.status === "converted" && item.noteId) {
      return c.json({ noteId: item.noteId, alreadyConverted: true }, 200);
    }
    if (item.status === "archived") {
      throw new HTTPException(409, {
        message: "Archived items cannot be converted.",
      });
    }

    const artifact = buildDraftArtifact(item);

    const [note] = await db
      .insert(researchNotes)
      .values({
        userId: user.id,
        title: item.title,
        kind: "draft",
        artifact,
        schemaVersion: artifact.schema_version,
        evidenceIds: [evidenceIdForItem(item.id)],
        asOf: artifact.capturedAt,
        sourceMeta: { sourceType: item.sourceType, inboxItemId: item.id },
      })
      .returning({ id: researchNotes.id });

    if (!note) {
      throw new HTTPException(500, { message: "Failed to create note." });
    }

    await db
      .update(evidenceInbox)
      .set({ status: "converted", noteId: note.id, updatedAt: new Date() })
      .where(
        and(eq(evidenceInbox.id, item.id), eq(evidenceInbox.userId, user.id)),
      );

    return c.json({ noteId: note.id, alreadyConverted: false }, 201);
  })

  // ── Delete (pre-conversion only) ──────────────────────────────────────────
  .delete("/:id", async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) throw unauthorized();

    const item = await getOwnItem(c.req.param("id"), user.id);
    if (item.status === "converted") {
      throw new HTTPException(409, {
        message: "Converted items cannot be deleted; archive them instead.",
      });
    }

    const [row] = await db
      .delete(evidenceInbox)
      .where(
        and(eq(evidenceInbox.id, item.id), eq(evidenceInbox.userId, user.id)),
      )
      .returning({ id: evidenceInbox.id });

    if (!row) throw notFound();
    return c.json({ ok: true });
  });

export type InboxRoute = typeof inboxRoute;
