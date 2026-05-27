import dayjs from "dayjs";

import {
  and,
  between,
  count,
  eq,
  getOrderByFromSort,
  ilike,
  inArray,
  or,
  sql,
} from "@workspace/db";
import {
  customer,
  order,
  organization,
  subscription,
  user,
} from "@workspace/db/schema";
import { db } from "@workspace/db/server";

import type { GetCustomersInput } from "../../../schema";

export const getCustomersCount = async () =>
  db
    .select({ count: count() })
    .from(customer)
    .then((res) => res[0]?.count ?? 0);

export const getCustomers = async (input: GetCustomersInput) => {
  const offset = (input.page - 1) * input.perPage;

  const where = and(
    input.q
      ? or(
          ilike(user.name, `%${input.q}%`),
          ilike(organization.name, `%${input.q}%`),
        )
      : undefined,
    input.provider ? inArray(customer.provider, input.provider) : undefined,
    input.createdAt
      ? between(
          customer.createdAt,
          dayjs(input.createdAt[0]).startOf("day").toDate(),
          dayjs(input.createdAt[1]).endOf("day").toDate(),
        )
      : undefined,
  );

  const having = and(
    input.subscriptions
      ? between(
          sql<number>`CAST(COUNT(${subscription.id}) AS INTEGER)`,
          input.subscriptions[0],
          input.subscriptions[1],
        )
      : undefined,
    input.orders
      ? between(
          sql<number>`CAST(COUNT(${order.id}) AS INTEGER)`,
          input.orders[0],
          input.orders[1],
        )
      : undefined,
  );

  const orderBy = input.sort
    ? input.sort.flatMap((s) => {
        const field = s.id.split(/[_.]/).pop() ?? s.id;
        if (["subscriptions", "orders"].includes(field)) {
          return [s.desc ? sql`${field} DESC` : sql`${field} ASC`];
        }
        if (field === "name") {
          return [
            s.desc
              ? sql`COALESCE(${user.name}, ${organization.name}) DESC`
              : sql`COALESCE(${user.name}, ${organization.name}) ASC`,
          ];
        }
        return getOrderByFromSort({ sort: [s], defaultSchema: customer });
      })
    : [sql`COALESCE(${user.name}, ${organization.name}) ASC`];

  return db.transaction(async (tx) => {
    const results = await db
      .select({
        id: customer.id,
        referenceId: customer.referenceId,
        provider: customer.provider,
        externalId: customer.externalId,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        user: {
          name: user.name,
          image: user.image,
        },
        organization: {
          name: organization.name,
          logo: organization.logo,
        },
        subscriptions:
          sql<number>`CAST(COUNT(${subscription.id}) AS INTEGER)`.as(
            "subscriptions",
          ),
        orders: sql<number>`CAST(COUNT(${order.id}) AS INTEGER)`.as("orders"),
        total: sql<number>`COUNT(*) OVER()`.mapWith(Number).as("total"),
      })
      .from(customer)
      .leftJoin(user, eq(customer.referenceId, user.id))
      .leftJoin(organization, eq(customer.referenceId, organization.id))
      .leftJoin(subscription, eq(customer.id, subscription.customerId))
      .leftJoin(order, eq(customer.id, order.customerId))
      .where(where)
      .groupBy(customer.id, user.id, organization.id)
      .having(having)
      .limit(input.perPage)
      .offset(offset)
      .orderBy(...orderBy);

    const subscriptionsMax = await tx
      .select({
        subscriptions:
          sql<number>`CAST(COUNT(${subscription.id}) AS INTEGER)`.as(
            "subscriptions",
          ),
      })
      .from(subscription)
      .groupBy(subscription.customerId)
      .orderBy(sql`subscriptions DESC`)
      .limit(1)
      .then((res) => res[0]?.subscriptions ?? 0);

    const ordersMax = await tx
      .select({
        orders: sql<number>`CAST(COUNT(${order.id}) AS INTEGER)`.as("orders"),
      })
      .from(order)
      .groupBy(order.customerId)
      .orderBy(sql`orders DESC`)
      .limit(1)
      .then((res) => res[0]?.orders ?? 0);

    const providerOptions = await tx
      .selectDistinct({
        provider: customer.provider,
      })
      .from(customer)
      .orderBy(sql`provider ASC`)
      .then((res) => res.map((r) => r.provider));

    const data = results.map(({ total: _, ...rest }) => rest);
    const total = results[0]?.total ?? 0;

    return {
      data,
      total,
      max: {
        subscriptions: subscriptionsMax,
        orders: ordersMax,
      },
      options: {
        provider: providerOptions,
      },
    };
  });
};
