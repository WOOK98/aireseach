import { redirect } from "next/navigation";

import { getBillingSummaryResponseSchema } from "@workspace/api/schema";
import { handle } from "@workspace/api/utils";
import { BillingReference } from "@workspace/billing";

import { pathsConfig } from "~/config/paths";
import { api } from "~/lib/api/server";
import { getSession } from "~/lib/auth/server";
import { getMetadata } from "~/lib/metadata";
import { BillingEmpty } from "~/modules/billing/settings/billing-empty";
import { OrdersList } from "~/modules/billing/settings/orders/list/orders-list";
import { BillingInfo } from "~/modules/billing/settings/portal/billing-info";
import { SubscriptionsList } from "~/modules/billing/settings/subscriptions/list/subscriptions-list";

export const generateMetadata = getMetadata({
  title: "billing",
  description: "billing:manage.description",
});

export default async function BillingPage() {
  const { user } = await getSession();

  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  const summary = await handle(api.billing.summary.$get, {
    schema: getBillingSummaryResponseSchema,
  })({
    query: {
      referenceId: user.id,
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
        referenceId={user.id}
        referenceType={BillingReference.USER}
      />
      <OrdersList referenceId={user.id} referenceType={BillingReference.USER} />
      <BillingInfo
        referenceId={user.id}
        referenceType={BillingReference.USER}
      />
    </>
  );
}
