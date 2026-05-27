import { buildConflictUpdateColumns } from "@workspace/db";
import { order } from "@workspace/db/schema";
import { db } from "@workspace/db/server";

import type { InsertOrder } from "@workspace/db/schema";

const orderConflictUpdateColumns = [
  "variantId",
  "status",
  "updatedAt",
] satisfies (keyof typeof order._.columns)[];

const orderConflictUpdateSet = buildConflictUpdateColumns(
  order,
  orderConflictUpdateColumns,
);

export const upsertOrder = async (data: InsertOrder) => {
  return db
    .insert(order)
    .values(data)
    .onConflictDoUpdate({
      target: [order.externalId, order.store],
      set: orderConflictUpdateSet,
    })
    .returning();
};

export const upsertOrders = async (data: InsertOrder[]) => {
  return db
    .insert(order)
    .values(data)
    .onConflictDoUpdate({
      target: [order.externalId, order.store],
      set: orderConflictUpdateSet,
    })
    .returning();
};
