import { buildConflictUpdateColumns, eq } from "@workspace/db";
import { subscription } from "@workspace/db/schema";
import { db } from "@workspace/db/server";

import type { InsertSubscription } from "@workspace/db/schema";

const subscriptionConflictUpdateColumns = [
  "variantId",
  "status",
  "periodStartsAt",
  "periodEndsAt",
  "trialStartsAt",
  "trialEndsAt",
  "updatedAt",
] satisfies (keyof typeof subscription._.columns)[];

const subscriptionConflictUpdateSet = buildConflictUpdateColumns(
  subscription,
  subscriptionConflictUpdateColumns,
);

export const upsertSubscription = async (data: InsertSubscription) => {
  return db
    .insert(subscription)
    .values(data)
    .onConflictDoUpdate({
      target: [subscription.externalId, subscription.store],
      set: subscriptionConflictUpdateSet,
    })
    .returning();
};

export const upsertSubscriptions = async (data: InsertSubscription[]) => {
  return db
    .insert(subscription)
    .values(data)
    .onConflictDoUpdate({
      target: [subscription.externalId, subscription.store],
      set: subscriptionConflictUpdateSet,
    })
    .returning();
};

export const getSubscriptionsByCustomerId = async (customerId: string) =>
  db.select().from(subscription).where(eq(subscription.customerId, customerId));
