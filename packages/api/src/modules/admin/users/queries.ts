import dayjs from "dayjs";

import {
  and,
  asc,
  between,
  count,
  eq,
  getOrderByFromSort,
  ilike,
  inArray,
  or,
} from "@workspace/db";
import {
  account,
  customer,
  invitation,
  member,
  order,
  organization,
  subscription,
  user,
} from "@workspace/db/schema";
import { db } from "@workspace/db/server";

import type {
  GetUserAccountsInput,
  GetUserInvitationsInput,
  GetUserMembershipsInput,
  GetUserOrdersInput,
  GetUsersInput,
  GetUserSubscriptionsInput,
} from "../../../schema";

export const getUsersCount = async () =>
  db
    .select({ count: count() })
    .from(user)
    .then((res) => res[0]?.count ?? 0);

export const getUsers = async (input: GetUsersInput) => {
  const offset = (input.page - 1) * input.perPage;

  const where = and(
    input.q
      ? or(ilike(user.name, `%${input.q}%`), ilike(user.email, `%${input.q}%`))
      : undefined,
    input.role ? inArray(user.role, input.role) : undefined,
    input.twoFactorEnabled
      ? inArray(user.twoFactorEnabled, input.twoFactorEnabled)
      : undefined,
    input.banned ? inArray(user.banned, input.banned) : undefined,
    input.createdAt
      ? between(
          user.createdAt,
          dayjs(input.createdAt[0]).startOf("day").toDate(),
          dayjs(input.createdAt[1]).endOf("day").toDate(),
        )
      : undefined,
  );

  const orderBy = input.sort
    ? getOrderByFromSort({ sort: input.sort, defaultSchema: user })
    : [asc(user.name)];

  return db.transaction(async (tx) => {
    const data = await tx
      .select()
      .from(user)
      .where(where)
      .limit(input.perPage)
      .offset(offset)
      .orderBy(...orderBy);

    const total = await tx
      .select({
        count: count(),
      })
      .from(user)
      .where(where)
      .execute()
      .then((res) => res[0]?.count ?? 0);

    return {
      data,
      total,
    };
  });
};

export const getUserAccounts = async ({
  userId,
  ...input
}: GetUserAccountsInput & { userId: string }) => {
  const offset = (input.page - 1) * input.perPage;

  const where = and(
    input.providerId
      ? inArray(account.providerId, input.providerId)
      : undefined,
    input.createdAt
      ? between(
          account.createdAt,
          dayjs(input.createdAt[0]).startOf("day").toDate(),
          dayjs(input.createdAt[1]).endOf("day").toDate(),
        )
      : undefined,
    input.updatedAt
      ? between(
          account.updatedAt,
          dayjs(input.updatedAt[0]).startOf("day").toDate(),
          dayjs(input.updatedAt[1]).endOf("day").toDate(),
        )
      : undefined,
    eq(account.userId, userId),
  );

  const orderBy = input.sort
    ? getOrderByFromSort({ sort: input.sort, defaultSchema: account })
    : [asc(account.providerId)];

  return db.transaction(async (tx) => {
    const data = await tx
      .select()
      .from(account)
      .where(where)
      .limit(input.perPage)
      .offset(offset)
      .orderBy(...orderBy);

    const total = await tx
      .select({
        count: count(),
      })
      .from(account)
      .where(where)
      .execute()
      .then((res) => res[0]?.count ?? 0);

    return {
      data,
      total,
    };
  });
};

export const getUserSubscriptions = async ({
  userId,
  ...input
}: GetUserSubscriptionsInput & { userId: string }) => {
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
    eq(customer.referenceId, userId),
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

export const getUserOrders = async ({
  userId,
  ...input
}: GetUserOrdersInput & { userId: string }) => {
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
    eq(customer.referenceId, userId),
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

export const getUserMemberships = async ({
  userId,
  ...input
}: GetUserMembershipsInput & { userId: string }) => {
  const offset = (input.page - 1) * input.perPage;

  const where = and(
    input.role ? inArray(member.role, input.role) : undefined,
    input.createdAt
      ? between(
          member.createdAt,
          dayjs(input.createdAt[0]).startOf("day").toDate(),
          dayjs(input.createdAt[1]).endOf("day").toDate(),
        )
      : undefined,
    eq(member.userId, userId),
  );

  const orderBy = input.sort
    ? getOrderByFromSort({ sort: input.sort, defaultSchema: member })
    : [asc(organization.name)];

  return db.transaction(async (tx) => {
    const data = await tx
      .select({
        id: member.id,
        organizationId: member.organizationId,
        role: member.role,
        createdAt: member.createdAt,
        userId: member.userId,
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          logo: organization.logo,
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
      })
      .from(member)
      .leftJoin(organization, eq(member.organizationId, organization.id))
      .leftJoin(user, eq(member.userId, user.id))
      .where(where)
      .limit(input.perPage)
      .offset(offset)
      .orderBy(...orderBy);

    const total = await tx
      .select({
        count: count(),
      })
      .from(member)
      .leftJoin(organization, eq(member.organizationId, organization.id))
      .where(where)
      .execute()
      .then((res) => res[0]?.count ?? 0);

    return {
      data,
      total,
    };
  });
};

export const getUserInvitations = async ({
  userId,
  ...input
}: GetUserInvitationsInput & { userId: string }) => {
  const offset = (input.page - 1) * input.perPage;

  const where = and(
    input.status ? inArray(invitation.status, input.status) : undefined,
    input.role ? inArray(invitation.role, input.role) : undefined,
    input.expiresAt
      ? between(
          invitation.expiresAt,
          dayjs(input.expiresAt[0]).startOf("day").toDate(),
          dayjs(input.expiresAt[1]).endOf("day").toDate(),
        )
      : undefined,
    eq(user.id, userId),
  );

  const orderBy = input.sort
    ? getOrderByFromSort({ sort: input.sort, defaultSchema: invitation })
    : [asc(organization.name)];

  return db.transaction(async (tx) => {
    const data = await tx
      .select({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        inviterId: invitation.inviterId,
        organizationId: invitation.organizationId,
        organization: {
          id: organization.id,
          name: organization.name,
          logo: organization.logo,
        },
      })
      .from(invitation)
      .leftJoin(organization, eq(invitation.organizationId, organization.id))
      .leftJoin(user, eq(invitation.email, user.email))
      .where(where)
      .limit(input.perPage)
      .offset(offset)
      .orderBy(...orderBy);

    const total = await tx
      .select({ count: count() })
      .from(invitation)
      .leftJoin(organization, eq(invitation.organizationId, organization.id))
      .leftJoin(user, eq(invitation.email, user.email))
      .where(where)
      .execute()
      .then((res) => res[0]?.count ?? 0);

    return {
      data,
      total,
    };
  });
};
