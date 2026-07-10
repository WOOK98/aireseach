import { Hono } from "hono";

import { ERROR_MESSAGES } from "@workspace/auth";
import { auth } from "@workspace/auth/server";
import { sql } from "@workspace/db";
import { db } from "@workspace/db/server";
import { HttpStatusCode } from "@workspace/shared/constants";
import { HttpException, isHttpStatus } from "@workspace/shared/utils";

import type { AuthErrorCode } from "@workspace/auth";

let authStorageReady: Promise<unknown> | null = null;

const ensureAuthStorage = () => {
  authStorageReady ??= db.execute(sql`
    CREATE TABLE IF NOT EXISTS "verification" (
      "id" text PRIMARY KEY NOT NULL,
      "identifier" text NOT NULL,
      "value" text NOT NULL,
      "expires_at" timestamp NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "verification_identifier_idx"
      ON "verification" USING btree ("identifier");
  `);

  return authStorageReady;
};

export const authRouter = new Hono().on(["GET", "POST"], "*", async (c) => {
  await ensureAuthStorage();

  const res = await auth.handler(c.req.raw);

  if (["2", "3"].includes(res.status.toString().slice(0, 1))) {
    return res;
  }

  const text = await res.text();
  const json = (() => {
    try {
      return JSON.parse(text) as { code: AuthErrorCode; message: string };
    } catch {
      return null;
    }
  })();

  throw new HttpException(
    isHttpStatus(res.status)
      ? res.status
      : HttpStatusCode.INTERNAL_SERVER_ERROR,
    json
      ? {
          code: ERROR_MESSAGES[json.code],
        }
      : undefined,
  );
});
