import { useQuery } from "@tanstack/react-query";

import { BillingReference } from "@workspace/billing";

import { authClient } from "~/lib/auth";
import { BillingEmpty, BillingLoading } from "~/modules/billing/layout";
import { billing } from "~/modules/billing/lib/api";
import { OrdersList } from "~/modules/billing/orders/list/orders-list";
import { BillingInfo } from "~/modules/billing/portal/billing-info";
import { SubscriptionsList } from "~/modules/billing/subscriptions/list/subscriptions-list";
import { ScrollView } from "~/modules/common/styled";

export default function OrganizationBilling() {
  const activeOrganization = authClient.useActiveOrganization();
  const organizationId = activeOrganization.data?.id;

  const summary = useQuery({
    ...billing.queries.summary.get(organizationId),
    enabled: !!organizationId,
  });

  if (!organizationId) {
    return null;
  }

  if (summary.isPending) {
    return <BillingLoading />;
  }

  if (
    summary.data?.every(
      (customer) => !customer.subscriptions.length && !customer.orders.length,
    )
  ) {
    return <BillingEmpty referenceType={BillingReference.ORGANIZATION} />;
  }

  return (
    <ScrollView
      className="bg-background px-6"
      contentContainerClassName="gap-8 pt-4 pb-8"
      showsVerticalScrollIndicator={false}
    >
      <SubscriptionsList
        referenceId={organizationId}
        referenceType={BillingReference.ORGANIZATION}
      />
      <OrdersList
        referenceId={organizationId}
        referenceType={BillingReference.ORGANIZATION}
      />
      <BillingInfo
        referenceId={organizationId}
        referenceType={BillingReference.ORGANIZATION}
      />
    </ScrollView>
  );
}
