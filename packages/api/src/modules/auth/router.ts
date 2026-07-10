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
    DO $$
    BEGIN
      CREATE TYPE "subscription_status" AS ENUM (
        'active',
        'canceled',
        'incomplete',
        'incomplete_expired',
        'past_due',
        'paused',
        'trialing',
        'unpaid'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$
    BEGIN
      CREATE TYPE "payment_status" AS ENUM ('pending', 'succeeded', 'failed');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS "user" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "email" text NOT NULL,
      "email_verified" boolean DEFAULT false NOT NULL,
      "image" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      "two_factor_enabled" boolean DEFAULT false,
      "is_anonymous" boolean DEFAULT false,
      "role" text,
      "banned" boolean DEFAULT false,
      "ban_reason" text,
      "ban_expires" timestamp
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "user_email_unique"
      ON "user" USING btree ("email");

    CREATE TABLE IF NOT EXISTS "session" (
      "id" text PRIMARY KEY NOT NULL,
      "expires_at" timestamp NOT NULL,
      "token" text NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      "ip_address" text,
      "user_agent" text,
      "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
      "impersonated_by" text,
      "active_organization_id" text
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "session_token_unique"
      ON "session" USING btree ("token");
    CREATE INDEX IF NOT EXISTS "session_userId_idx"
      ON "session" USING btree ("user_id");

    CREATE TABLE IF NOT EXISTS "account" (
      "id" text PRIMARY KEY NOT NULL,
      "account_id" text NOT NULL,
      "provider_id" text NOT NULL,
      "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
      "access_token" text,
      "refresh_token" text,
      "id_token" text,
      "access_token_expires_at" timestamp,
      "refresh_token_expires_at" timestamp,
      "scope" text,
      "password" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "account_userId_idx"
      ON "account" USING btree ("user_id");

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

    CREATE TABLE IF NOT EXISTS "passkey" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text,
      "public_key" text NOT NULL,
      "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
      "credential_id" text NOT NULL,
      "counter" integer NOT NULL,
      "device_type" text NOT NULL,
      "backed_up" boolean NOT NULL,
      "transports" text,
      "created_at" timestamp,
      "aaguid" text
    );
    CREATE INDEX IF NOT EXISTS "passkey_userId_idx"
      ON "passkey" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "passkey_credentialID_idx"
      ON "passkey" USING btree ("credential_id");

    CREATE TABLE IF NOT EXISTS "two_factor" (
      "id" text PRIMARY KEY NOT NULL,
      "secret" text NOT NULL,
      "backup_codes" text NOT NULL,
      "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
      "verified" boolean DEFAULT true
    );
    CREATE INDEX IF NOT EXISTS "twoFactor_secret_idx"
      ON "two_factor" USING btree ("secret");
    CREATE INDEX IF NOT EXISTS "twoFactor_userId_idx"
      ON "two_factor" USING btree ("user_id");

    CREATE TABLE IF NOT EXISTS "organization" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "slug" text NOT NULL,
      "logo" text,
      "created_at" timestamp NOT NULL,
      "metadata" text
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "organization_slug_uidx"
      ON "organization" USING btree ("slug");

    CREATE TABLE IF NOT EXISTS "member" (
      "id" text PRIMARY KEY NOT NULL,
      "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
      "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
      "role" text DEFAULT 'member' NOT NULL,
      "created_at" timestamp NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "member_organizationId_idx"
      ON "member" USING btree ("organization_id");
    CREATE INDEX IF NOT EXISTS "member_userId_idx"
      ON "member" USING btree ("user_id");

    CREATE TABLE IF NOT EXISTS "invitation" (
      "id" text PRIMARY KEY NOT NULL,
      "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
      "email" text NOT NULL,
      "role" text,
      "status" text DEFAULT 'pending' NOT NULL,
      "expires_at" timestamp NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "inviter_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade
    );
    CREATE INDEX IF NOT EXISTS "invitation_organizationId_idx"
      ON "invitation" USING btree ("organization_id");
    CREATE INDEX IF NOT EXISTS "invitation_email_idx"
      ON "invitation" USING btree ("email");

    CREATE TABLE IF NOT EXISTS "customer" (
      "id" text PRIMARY KEY NOT NULL,
      "reference_id" text NOT NULL,
      "external_id" text NOT NULL,
      "provider" text NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "customer_reference_id_provider_unique"
      ON "customer" USING btree ("reference_id", "provider");
    CREATE UNIQUE INDEX IF NOT EXISTS "customer_external_id_provider_unique"
      ON "customer" USING btree ("external_id", "provider");

    CREATE TABLE IF NOT EXISTS "subscription" (
      "id" text PRIMARY KEY NOT NULL,
      "customer_id" text NOT NULL REFERENCES "customer"("id") ON DELETE cascade,
      "external_id" text NOT NULL,
      "variant_id" text NOT NULL,
      "status" "subscription_status" NOT NULL,
      "store" text NOT NULL,
      "period_starts_at" timestamp NOT NULL,
      "period_ends_at" timestamp NOT NULL,
      "trial_starts_at" timestamp,
      "trial_ends_at" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "subscription_external_id_store_unique"
      ON "subscription" USING btree ("external_id", "store");

    CREATE TABLE IF NOT EXISTS "order" (
      "id" text PRIMARY KEY NOT NULL,
      "customer_id" text NOT NULL REFERENCES "customer"("id") ON DELETE cascade,
      "external_id" text NOT NULL,
      "variant_id" text NOT NULL,
      "status" "payment_status" NOT NULL,
      "store" text NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "order_external_id_store_unique"
      ON "order" USING btree ("external_id", "store");
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
