import { notFound, redirect } from "next/navigation";

import { getBillingSummaryResponseSchema } from "@workspace/api/schema";
import { handle } from "@workspace/api/utils";
import { toMemberRole } from "@workspace/auth";
import { BillingReference } from "@workspace/billing";

import { pathsConfig } from "~/config/paths";
import { api } from "~/lib/api/server";
import { authClient } from "~/lib/auth/client";
import {
  getMemberByUserId,
  getOrganization,
  getSession,
} from "~/lib/auth/server";
import { getMetadata } from "~/lib/metadata";
import { BillingEmpty } from "~/modules/billing/settings/billing-empty";
import { OrdersList } from "~/modules/billing/settings/orders/list/orders-list";
import { BillingInfo } from "~/modules/billing/settings/portal/billing-info";
import { SubscriptionsList } from "~/modules/billing/settings/subscriptions/list/subscriptions-list";

export const generateMetadata = getMetadata({
  title: "organization:billing.title",
  description: "organization:billing.description",
});

export default async function BillingPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const activeOrganization = await getOrganization({ slug: organization });
  const { user } = await getSession();

  if (!activeOrganization) {
    return notFound();
  }

  const member = await getMemberByUserId({
    organizationId: activeOrganization.id,
    userId: user?.id ?? "",
  });
  const canRead = authClient.organization.checkRolePermission({
    permissions: {
      billing: ["read"],
    },
    role: toMemberRole(member?.role),
  });

  if (!canRead) {
    return redirect(pathsConfig.dashboard.organization(organization).index);
  }

  const summary = await handle(api.billing.summary.$get, {
    schema: getBillingSummaryResponseSchema,
  })({
    query: {
      referenceId: activeOrganization.id,
    },
  });

  if (
    summary.every(
      (customer) => !customer.subscriptions.length && !customer.orders.length,
    )
  ) {
    return <BillingEmpty />;
  }

  return (
    <>
      <SubscriptionsList
        referenceId={activeOrganization.id}
        referenceType={BillingReference.ORGANIZATION}
      />
      <OrdersList
        referenceId={activeOrganization.id}
        referenceType={BillingReference.ORGANIZATION}
      />
      <BillingInfo
        referenceId={activeOrganization.id}
        referenceType={BillingReference.ORGANIZATION}
      />
    </>
  );
}
