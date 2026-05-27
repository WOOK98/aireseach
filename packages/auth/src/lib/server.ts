import {
  isSubscriptionActive,
  BillingType,
  findVariantById,
} from "@workspace/billing";
import * as web from "@workspace/billing-web/server";
import {
  getCustomersWithPurchasesByReferenceId,
  getOrganizationBillableSeatsCount,
} from "@workspace/billing/server";
import { and, eq, sql } from "@workspace/db";
import { member, organization } from "@workspace/db/schema";
import { db } from "@workspace/db/server";

import { MemberRole } from "../types";

export const syncSubscriptionSeats = async (organizationId: string) => {
  const summary = await getCustomersWithPurchasesByReferenceId(organizationId);

  const activePerSeatSubscriptions = summary
    .flatMap((customer) => customer.subscriptions)
    .filter(
      (subscription) =>
        isSubscriptionActive(subscription) &&
        findVariantById(subscription.variantId)?.type === BillingType.PER_SEAT,
    );

  if (!activePerSeatSubscriptions.length) {
    return;
  }

  const seats = await getOrganizationBillableSeatsCount(organizationId);

  await Promise.all(
    activePerSeatSubscriptions.map(async (subscription) =>
      web.updateSubscription(subscription.externalId, {
        quantity: seats,
      }),
    ),
  );
};

export const getOrganizationsBlockingAccountDeletion = ({
  userId,
}: {
  userId: string;
}) => {
  return db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    })
    .from(organization)
    .innerJoin(
      member,
      and(
        eq(member.organizationId, organization.id),
        eq(member.userId, userId),
        eq(member.role, MemberRole.OWNER),
      ),
    )
    .where(
      and(
        eq(
          sql<number>`(
            select count(*)
            from ${member} as owners
            where owners.organization_id = ${organization.id}
              and owners.role = ${MemberRole.OWNER}
          )`,
          1,
        ),
        sql<number>`(
          select count(*)
          from ${member} as members
          where members.organization_id = ${organization.id}
            and members.user_id <> ${userId}
        ) > 0`,
      ),
    );
};

export const canLeaveOrganization = async ({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}) => {
  const otherOwners = await db.query.member.findMany({
    where: (member, { eq, and, not }) =>
      and(
        eq(member.organizationId, organizationId),
        eq(member.role, MemberRole.OWNER),
        not(eq(member.userId, userId)),
      ),
  });

  return otherOwners.length > 0;
};
