import { HTTPException } from "hono/http-exception";
import * as z from "zod";

import { isKey } from "@workspace/i18n";
import { getTranslation } from "@workspace/i18n/server";
import { captureException } from "@workspace/monitoring-web/server";
import { HttpStatusCode } from "@workspace/shared/constants";
import { logger } from "@workspace/shared/logger";
import { getStatusCode } from "@workspace/shared/utils";

import type { Context } from "hono";

const errorSchema = z.object({
  code: z.string().optional(),
  message: z.string(),
});

const isError = (e: unknown): e is z.infer<typeof errorSchema> => {
  return errorSchema.safeParse(e).success;
};

export const onError = async (
  e: unknown,
  c?: Context<{
    Bindings: { NODE_ENV: string };
    Variables: { locale: string };
  }>,
) => {
  const { t, i18n } = await getTranslation({
    locale: c?.var.locale,
    request: c?.req.raw,
  });

  const status = getStatusCode(e);
  const details = {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  };

  const timestamp = new Date().toISOString();
  const path = c?.req.raw.url ? new URL(c.req.raw.url).pathname : "/api";

  if (status >= HttpStatusCode.INTERNAL_SERVER_ERROR) {
    captureException(e, { path, status, timestamp });
  }

  if (isError(e)) {
    logger.error(e.code, e.message);
    // P0 (#195): only messages we authored (HTTPException) or client-error
    // statuses are safe to echo. Arbitrary 5xx errors (e.g. Drizzle DB
    // failures) carry raw SQL, params and paths — return a neutral message
    // instead; the raw error stays in logs/monitoring.
    const trusted = e instanceof HTTPException || status < 500;
    const code = e instanceof HTTPException ? undefined : e.code;
    return new Response(
      JSON.stringify({
        code: trusted ? code : "common:error.general",
        message: trusted
          ? e.message
            ? e.message
            : code && isKey(code, i18n)
              ? t(code)
              : ((e.message || code) ?? t("common:error.general"))
          : t("common:error.general"),
        status,
        timestamp,
        path,
      }),
      details,
    );
  }

  logger.error(e);
  return new Response(
    JSON.stringify({
      code: "common:error.general",
      message: t("common:error.general"),
      status,
      path,
    }),
    details,
  );
};
