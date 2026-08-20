import { Hono } from "hono";
import { statusMonitor } from "hono-status-monitor";
import { some } from "hono/combine";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { logger as loggerMiddleware } from "hono/logger";

import { auth } from "@workspace/auth/server";
import { db } from "@workspace/db/server";
import { Platform } from "@workspace/shared/constants";
import { logger } from "@workspace/shared/logger";
import { matchesPattern } from "@workspace/shared/utils";

import { localize, delay } from "./middleware";
import { adminRouter } from "./modules/admin/router";
import { aiRouter } from "./modules/ai/router";
import { articleRoute } from "./modules/article/route";
import { authRouter } from "./modules/auth/router";
import { billingRouter } from "./modules/billing/router";
import { compareRouter } from "./modules/compare/router";
import { ledgerRoute } from "./modules/ledger/router";
import { mcpRouter } from "./modules/mcp/router";
import { notesRoute } from "./modules/notes/route";
import { organizationRouter } from "./modules/organization/router";
import { pdfAnnotationsRoute, pdfsRoute } from "./modules/pdfs/route";
import { reportRoute } from "./modules/report/route";
import { storageRouter } from "./modules/storage/router";
import { visualsRouter } from "./modules/visuals/router";
import { watchlistRouter } from "./modules/watchlist/router";
import { webhooksRouter } from "./modules/webhooks/router";
import { onError } from "./utils/on-error";

import type { Context } from "hono";

const monitor = statusMonitor({
  healthCheck: async () => {
    const start = performance.now();
    await db.execute(`SELECT 1`);
    return {
      connected: true,
      latencyMs: performance.now() - start,
    };
  },
});

const appRouter = new Hono()
  .basePath("/api")
  .use(
    some(
      (c: Context) =>
        !!c.req.header("x-client-platform")?.startsWith(Platform.MOBILE),
      csrf({
        origin: (origin, c) =>
          [...auth.options.trustedOrigins, new URL(c.req.url).origin].some(
            (trustedOrigin) => matchesPattern(origin, trustedOrigin),
          ),
      }),
    ),
  )
  .use(
    cors({
      origin: "*",
      allowHeaders: ["Content-Type", "Authorization"],
      maxAge: 3600,
      credentials: true,
    }),
  )
  .use(loggerMiddleware((...args) => logger.info(...args)))
  .use(delay)
  .use(localize)
  .use(monitor.middleware)
  .route("/status", monitor.routes)
  .route("/admin", adminRouter)
  .route("/ai", aiRouter)
  .route("/auth", authRouter)
  .route("/billing", billingRouter)
  .route("/mcp", mcpRouter)
  .route("/organizations", organizationRouter)
  .route("/storage", storageRouter)
  .route("/watchlist", watchlistRouter)
  .route("/compare", compareRouter)
  .route("/report", reportRoute)
  .route("/article", articleRoute)
  .route("/notes", notesRoute)
  .route("/pdfs", pdfsRoute)
  .route("/pdfs/annotations", pdfAnnotationsRoute)
  .route("/ledger", ledgerRoute)
  .route("/visuals", visualsRouter)
  .route("/webhooks", webhooksRouter)
  .onError(onError);

type AppRouter = typeof appRouter;

export type { AppRouter };
export { appRouter };
