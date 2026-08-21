/**
 * Research PDFs — API Route (knife-2 slice 1)
 *
 *   POST   /api/pdfs                      register PDF → { pdf, uploadUrl }
 *   GET    /api/pdfs                      list current user's PDFs
 *   GET    /api/pdfs/:id                  detail + signed file URL (1h)
 *   PATCH  /api/pdfs/:id                  edit metadata only (strict)
 *   DELETE /api/pdfs/:id                  delete row + best-effort blob delete
 *   GET    /api/pdfs/:id/annotations      list annotations for a PDF
 *   POST   /api/pdfs/:id/annotations      create annotation
 *   PATCH  /api/pdfs/annotations/:id      replace annotation payload
 *   DELETE /api/pdfs/annotations/:id      delete annotation
 *
 * REDLINES:
 * - user-scoped: every query filters session user.id; cross-user ids 404
 *   (no existence leak).
 * - blobKey derived server-side; never accepted from / returned to clients.
 * - upload flow: client POSTs metadata → server returns a 60s presigned PUT
 *   URL → client uploads bytes directly to storage. Bytes never pass through
 *   this API.
 * - MIME whitelist is enforced at the signed upload boundary: the presigned
 *   PUT is content-type-pinned to `application/pdf`, so storage rejects PUTs
 *   with any other Content-Type even if a client bypasses the UI. The web
 *   client sends exactly that header on upload.
 * - neutral errors: no stack / schema detail leakage in responses.
 */
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { auth } from "@workspace/auth/server";
import { and, asc, desc, eq, ilike, or } from "@workspace/db";
import { pdfAnnotations, researchPdfs } from "@workspace/db/schema";
import { db } from "@workspace/db/server";
import { generateId } from "@workspace/shared/utils";
import {
  getDeleteUrl,
  getSignedUrl,
  getUploadUrl,
} from "@workspace/storage/server";

import {
  annotationKindFromPayload,
  createAnnotationInputSchema,
  createPdfInputSchema,
  listPdfsQuerySchema,
  patchAnnotationInputSchema,
  patchPdfInputSchema,
  pdfBlobKey,
  toAnnotationItem,
  toPdfItem,
} from "./pdf-mapper";

const getUser = async (headers: Headers) => {
  const session = await auth.api.getSession({ headers });
  return session?.user ?? null;
};

const unauthorized = () => new HTTPException(401, { message: "Unauthorized" });
const pdfNotFound = () => new HTTPException(404, { message: "PDF not found." });
const annotationNotFound = () =>
  new HTTPException(404, { message: "Annotation not found." });

/** Fetch a PDF row owned by the user, or throw 404. */
async function requireOwnedPdf(pdfId: string, userId: string) {
  const [row] = await db
    .select()
    .from(researchPdfs)
    .where(and(eq(researchPdfs.id, pdfId), eq(researchPdfs.userId, userId)))
    .limit(1);
  if (!row) throw pdfNotFound();
  return row;
}

export const pdfsRoute = new Hono()

  // ── Create: register metadata + hand back a presigned upload URL ─────────
  .post("/", zValidator("json", createPdfInputSchema), async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) throw unauthorized();

    const input = c.req.valid("json");

    // Generate the id up-front so the blob key can embed it.
    const id = generateId();
    const blobKey = pdfBlobKey(user.id, id);

    const [row] = await db
      .insert(researchPdfs)
      .values({
        id,
        userId: user.id,
        fileName: input.fileName,
        blobKey,
        fileSizeBytes: input.fileSizeBytes,
        ticker: input.ticker ?? null,
        reportPeriod: input.reportPeriod ?? null,
        sourceLabel: input.sourceLabel ?? null,
      })
      .returning();

    if (!row) {
      throw new HTTPException(500, { message: "Failed to register PDF." });
    }

    let uploadUrl: string;
    try {
      ({ url: uploadUrl } = await getUploadUrl({
        path: blobKey,
        contentType: "application/pdf",
      }));
    } catch {
      // Roll back the row so we never strand metadata without a blob.
      await db.delete(researchPdfs).where(eq(researchPdfs.id, row.id));
      throw new HTTPException(502, { message: "Storage unavailable." });
    }

    return c.json({ pdf: toPdfItem(row), uploadUrl }, 201);
  })

  // ── List ─────────────────────────────────────────────────────────────────
  .get("/", zValidator("query", listPdfsQuerySchema), async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) throw unauthorized();

    const { q, ticker, limit, offset } = c.req.valid("query");

    const conditions = [eq(researchPdfs.userId, user.id)];
    if (ticker) conditions.push(eq(researchPdfs.ticker, ticker));
    if (q) {
      const pattern = `%${q}%`;
      const search = or(
        ilike(researchPdfs.fileName, pattern),
        ilike(researchPdfs.sourceLabel, pattern),
      );
      if (search) conditions.push(search);
    }

    const rows = await db
      .select()
      .from(researchPdfs)
      .where(and(...conditions))
      .orderBy(desc(researchPdfs.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({ pdfs: rows.map(toPdfItem) });
  })

  // ── Detail + signed file URL ─────────────────────────────────────────────
  .get("/:id", async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) throw unauthorized();

    const row = await requireOwnedPdf(c.req.param("id"), user.id);

    let fileUrl: string;
    try {
      ({ url: fileUrl } = await getSignedUrl({ path: row.blobKey }));
    } catch {
      throw new HTTPException(502, { message: "Storage unavailable." });
    }

    return c.json({ pdf: toPdfItem(row), fileUrl });
  })

  // ── Patch (metadata only) ────────────────────────────────────────────────
  .patch("/:id", zValidator("json", patchPdfInputSchema), async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) throw unauthorized();

    const patch = c.req.valid("json");
    if (Object.keys(patch).length === 0) {
      throw new HTTPException(400, { message: "Nothing to update." });
    }

    const [row] = await db
      .update(researchPdfs)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(researchPdfs.id, c.req.param("id")),
          eq(researchPdfs.userId, user.id),
        ),
      )
      .returning();

    if (!row) throw pdfNotFound();
    return c.json({ pdf: toPdfItem(row) });
  })

  // ── Delete (row + best-effort blob) ──────────────────────────────────────
  .delete("/:id", async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) throw unauthorized();

    const [row] = await db
      .delete(researchPdfs)
      .where(
        and(
          eq(researchPdfs.id, c.req.param("id")),
          eq(researchPdfs.userId, user.id),
        ),
      )
      .returning({ id: researchPdfs.id, blobKey: researchPdfs.blobKey });

    if (!row) throw pdfNotFound();

    // Best-effort blob cleanup — row is already gone, never fail the
    // request on storage errors. (Annotations cascade with the row.)
    try {
      const { url } = await getDeleteUrl({ path: row.blobKey });
      await fetch(url, { method: "DELETE" });
    } catch {
      /* orphaned blob is acceptable; row is source of truth */
    }

    return c.json({ ok: true });
  })

  // ── Annotations: list ────────────────────────────────────────────────────
  .get("/:id/annotations", async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) throw unauthorized();

    const pdf = await requireOwnedPdf(c.req.param("id"), user.id);

    const rows = await db
      .select()
      .from(pdfAnnotations)
      .where(
        and(
          eq(pdfAnnotations.pdfId, pdf.id),
          eq(pdfAnnotations.userId, user.id),
        ),
      )
      .orderBy(asc(pdfAnnotations.page), asc(pdfAnnotations.createdAt));

    return c.json({ annotations: rows.map(toAnnotationItem) });
  })

  // ── Annotations: create ──────────────────────────────────────────────────
  .post(
    "/:id/annotations",
    zValidator("json", createAnnotationInputSchema),
    async (c) => {
      const user = await getUser(c.req.raw.headers);
      if (!user) throw unauthorized();

      const pdf = await requireOwnedPdf(c.req.param("id"), user.id);
      const input = c.req.valid("json");

      const [row] = await db
        .insert(pdfAnnotations)
        .values({
          pdfId: pdf.id,
          userId: user.id,
          page: input.page,
          kind: annotationKindFromPayload(input.payload),
          payload: input.payload,
        })
        .returning();

      if (!row) {
        throw new HTTPException(500, {
          message: "Failed to save annotation.",
        });
      }

      return c.json({ annotation: toAnnotationItem(row) }, 201);
    },
  );

/** Nested routes for individual annotations (pdf id not needed — user-scoped). */
export const pdfAnnotationsRoute = new Hono()

  // ── Patch: replace payload (new version + updatedAt; never silent edits) ──
  .patch("/:id", zValidator("json", patchAnnotationInputSchema), async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) throw unauthorized();

    const { payload } = c.req.valid("json");

    const [row] = await db
      .update(pdfAnnotations)
      .set({
        payload,
        kind: annotationKindFromPayload(payload),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(pdfAnnotations.id, c.req.param("id")),
          eq(pdfAnnotations.userId, user.id),
        ),
      )
      .returning();

    if (!row) throw annotationNotFound();
    return c.json({ annotation: toAnnotationItem(row) });
  })

  // ── Delete ───────────────────────────────────────────────────────────────
  .delete("/:id", async (c) => {
    const user = await getUser(c.req.raw.headers);
    if (!user) throw unauthorized();

    const [row] = await db
      .delete(pdfAnnotations)
      .where(
        and(
          eq(pdfAnnotations.id, c.req.param("id")),
          eq(pdfAnnotations.userId, user.id),
        ),
      )
      .returning({ id: pdfAnnotations.id });

    if (!row) throw annotationNotFound();
    return c.json({ ok: true });
  });

export type PdfsRoute = typeof pdfsRoute;
export type PdfAnnotationsRoute = typeof pdfAnnotationsRoute;
