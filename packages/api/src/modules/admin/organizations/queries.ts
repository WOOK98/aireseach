import dayjs from "dayjs";

import {
  and,
  asc,
  between,
  count,
  eq,
  getOrderByFromSort,
  inArray,
  ilike,
  sql,
} from "@workspace/db";
import {
  customer,
  member,
  order,
  organization,
  subscription,
} from "@workspace/db/schema";
import { db } from "@workspace/db/server";

import type {
  GetOrganizationOrdersInput,
  GetOrganizationsInput,
  GetOrganizationSubscriptionsInput,
} from "../../../schema";

export const getOrganizationsCount = async () =>
  db
    .select({ count: count() })
    .from(organization)
    .then((res) => res[0]?.count ?? 0);

export const getOrganizations = async (input: GetOrganizationsInput) => {
  const offset = (input.page - 1) * input.perPage;

  const where = and(
    input.q ? ilike(organization.name, `%${input.q}%`) : undefined,
    input.createdAt
      ? between(
          organization.createdAt,
          dayjs(input.createdAt[0]).startOf("day").toDate(),
          dayjs(input.createdAt[1]).endOf("day").toDate(),
        )
      : undefined,
  );

  const having = input.members
    ? between(
        sql<number>`CAST(COUNT(${member.id}) AS INTEGER)`,
        input.members[0],
        input.members[1],
      )
    : undefined;

  const orderBy =
    input.sort && input.sort.length > 0
      ? input.sort.flatMap((s) => {
          const field = s.id.split(/[_.]/).pop() ?? s.id;
          if (field === "members") {
            return [s.desc ? sql`members DESC` : sql`members ASC`];
          }
          return getOrderByFromSort({ sort: [s], defaultSchema: organization });
        })
      : [asc(organization.name)];

  return db.transaction(async (tx) => {
    const results = await tx
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        createdAt: organization.createdAt,
        members: sql<number>`CAST(COUNT(${member.id}) AS INTEGER)`.as(
          "members",
        ),
        total: sql<number>`COUNT(*) OVER()`.mapWith(Number).as("total"),
      })
      .from(organization)
      .leftJoin(member, eq(member.organizationId, organization.id))
      .where(where)
      .groupBy(organization.id)
      .having(having)
      .limit(input.perPage)
      .offset(offset)
      .orderBy(...orderBy);

    const membersMax = await tx
      .select({
        members: sql<number>`CAST(COUNT(${member.id}) AS INTEGER)`.as(
          "members",
        ),
      })
      .from(member)
      .groupBy(member.organizationId)
      .orderBy(sql`members DESC`)
      .limit(1)
      .then((res) => res[0]?.members ?? 0);

    const data = results.map(({ total: _, ...rest }) => rest);
    const total = results[0]?.total ?? 0;

    return {
      data,
      total,
      max: { members: membersMax },
    };
  });
};

export const getOrganization = async ({ id }: { id: string }) => {
  return (
    (await db.query.organization.findFirst({
      where: eq(organization.id, id),
    })) ?? null
  );
};

export const getOrganizationSubscriptions = async ({
  organizationId,
  ...input
}: GetOrganizationSubscriptionsInput & { organizationId: string }) => {
  const offset = (input.page - 1) * input.perPage;

  const where = and(
    input.status ? inArray(subscription.status, input.status) : undefined,
    input.createdAt
      ? between(
          subscription.createdAt,
          dayjs(input.createdAt[0]).startOf("day").toDate(),
          dayjs(input.createdAt[1]).endOf("day").toDate(),
        )
      : undefined,
    eq(customer.referenceId, organizationId),
  );

  const orderBy = input.sort
    ? getOrderByFromSort({ sort: input.sort, defaultSchema: subscription })
    : [asc(subscription.id)];

  return db.transaction(async (tx) => {
    const data = await tx
      .select({
        id: subscription.id,
        externalId: subscription.externalId,
        customerId: subscription.customerId,
        variantId: subscription.variantId,
        status: subscription.status,
        store: subscription.store,
        periodStartsAt: subscription.periodStartsAt,
        periodEndsAt: subscription.periodEndsAt,
        trialStartsAt: subscription.trialStartsAt,
        trialEndsAt: subscription.trialEndsAt,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      })
      .from(subscription)
      .leftJoin(customer, eq(subscription.customerId, customer.id))
      .where(where)
      .limit(input.perPage)
      .offset(offset)
      .orderBy(...orderBy);

    const total = await tx
      .select({ count: count() })
      .from(subscription)
      .leftJoin(customer, eq(subscription.customerId, customer.id))
      .where(where)
      .execute()
      .then((res) => res[0]?.count ?? 0);

    return {
      data,
      total,
    };
  });
};

export const getOrganizationOrders = async ({
  organizationId,
  ...input
}: GetOrganizationOrdersInput & { organizationId: string }) => {
  const offset = (input.page - 1) * input.perPage;

  const where = and(
    input.status
      ? inArray(
          order.status,
          Array.isArray(input.status) ? input.status : [input.status],
        )
      : undefined,
    input.createdAt
      ? between(
          order.createdAt,
          dayjs(input.createdAt[0]).startOf("day").toDate(),
          dayjs(input.createdAt[1]).endOf("day").toDate(),
        )
      : undefined,
    eq(customer.referenceId, organizationId),
  );

  const orderBy = input.sort
    ? getOrderByFromSort({ sort: input.sort, defaultSchema: order })
    : [asc(order.id)];

  return db.transaction(async (tx) => {
    const data = await tx
      .select({
        id: order.id,
        customerId: order.customerId,
        externalId: order.externalId,
        variantId: order.variantId,
        status: order.status,
        store: order.store,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })
      .from(order)
      .leftJoin(customer, eq(order.customerId, customer.id))
      .where(where)
      .limit(input.perPage)
      .offset(offset)
      .orderBy(...orderBy);

    const total = await tx
      .select({ count: count() })
      .from(order)
      .leftJoin(customer, eq(order.customerId, customer.id))
      .where(where)
      .execute()
      .then((res) => res[0]?.count ?? 0);

    return {
      data,
      total,
    };
  });
};
