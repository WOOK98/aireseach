CREATE TYPE "public"."payment_status" AS ENUM('pending', 'succeeded', 'failed');--> statement-breakpoint
ALTER TYPE "public"."status" RENAME TO "subscription_status";--> statement-breakpoint
CREATE TABLE "order" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"external_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"status" "payment_status" NOT NULL,
	"store" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "order_externalId_store_unique" UNIQUE("external_id","store")
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"external_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"status" "subscription_status" NOT NULL,
	"store" text NOT NULL,
	"period_starts_at" timestamp NOT NULL,
	"period_ends_at" timestamp NOT NULL,
	"trial_starts_at" timestamp,
	"trial_ends_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "subscription_externalId_store_unique" UNIQUE("external_id","store")
);
--> statement-breakpoint
ALTER TABLE "customer" RENAME COLUMN "user_id" TO "reference_id";--> statement-breakpoint
ALTER TABLE "customer" RENAME COLUMN "customer_id" TO "external_id";--> statement-breakpoint
ALTER TABLE "customer" DROP CONSTRAINT "customer_userId_unique";--> statement-breakpoint
ALTER TABLE "customer" DROP CONSTRAINT "customer_customerId_unique";--> statement-breakpoint
ALTER TABLE "customer" DROP CONSTRAINT "customer_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "provider" text NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_uidx" ON "organization" USING btree ("slug");--> statement-breakpoint
ALTER TABLE "customer" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "customer" DROP COLUMN "plan";--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_referenceId_provider_unique" UNIQUE("reference_id","provider");--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_externalId_provider_unique" UNIQUE("external_id","provider");--> statement-breakpoint
DROP TYPE "public"."plan";--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."delete_customers_on_user_delete"()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "public"."customer" WHERE "reference_id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "delete_customers_on_user_delete_trigger"
AFTER DELETE ON "public"."user"
FOR EACH ROW
EXECUTE FUNCTION "public"."delete_customers_on_user_delete"();