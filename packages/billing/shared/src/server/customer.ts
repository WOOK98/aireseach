import { and, count, eq, inArray, sql } from "@workspace/db";
import { customer, member } from "@workspace/db/schema";
import { db } from "@workspace/db/server";

import { ACTIVE_SUBSCRIPTION_STATUSES } from "../config";

import type { InsertCustomer } from "@workspace/db/schema";

export const getCustomersByReferenceId = async (
  referenceId: string,
  options?: { provider?: string },
) =>
  db
    .select()
    .from(customer)
    .where(
      and(
        options?.provider ? eq(customer.provider, options.provider) : undefined,
        eq(customer.referenceId, referenceId),
      ),
    );

export const getCustomersWithPurchasesByReferenceId = async (
  referenceId: string,
) =>
  db.query.customer.findMany({
    with: {
      subscriptions: {
        orderBy: (subscription, { asc, desc }) => [
          asc(
            sql`case when ${inArray(
              subscription.status,
              ACTIVE_SUBSCRIPTION_STATUSES,
            )} then 0 else 1 end`,
          ),
          desc(subscription.updatedAt),
        ],
      },
      orders: {
        orderBy: (order, { asc, desc }) => [
          asc(
            sql`case
              when ${order.status} = 'succeeded' then 0
              when ${order.status} = 'pending' then 1
              else 2
            end`,
          ),
          desc(order.updatedAt),
        ],
      },
    },
    where: eq(customer.referenceId, referenceId),
    orderBy: (t) => sql`${t.createdAt} desc`,
  });

export const getCustomerById = async (id: string) => {
  const [data] = await db.select().from(customer).where(eq(customer.id, id));

  return data ?? null;
};

export const getCustomerByExternalId = async (externalId: string) => {
  const [data] = await db
    .select()
    .from(customer)
    .where(eq(customer.externalId, externalId));

  return data ?? null;
};

export const updateCustomer = (id: string, data: Partial<InsertCustomer>) => {
  return db.update(customer).set(data).where(eq(customer.id, id));
};

export const upsertCustomer = (data: InsertCustomer) => {
  return db
    .insert(customer)
    .values(data)
    .onConflictDoUpdate({
      target: [customer.externalId, customer.provider],
      set: data,
    })
    .returning();
};

export const getOrganizationBillableSeatsCount = async (
  organizationId: string,
) => {
  const [total] = await db
    .select({ count: count() })
    .from(member)
    .where(eq(member.organizationId, organizationId));
  return Math.max(1, total?.count ?? 0);
};
