import { BetterAuthOptions } from "better-auth";

import { isSubscriptionActive } from "@workspace/billing";
import { getCustomersWithPurchasesByReferenceId } from "@workspace/billing/server";

import { getOrganizationsBlockingAccountDeletion } from "../../lib/server";

export const deleteUser = {
  beforeDelete: async (user) => {
    const blockingOrganizations = await getOrganizationsBlockingAccountDeletion(
      { userId: user.id },
    );

    if (blockingOrganizations.length > 0) {
      throw new Error(
        "You cannot delete your account because you are the sole owner of organizations with other members.",
      );
    }

    const customers = await getCustomersWithPurchasesByReferenceId(user.id);
    const activeSubscriptions = customers.flatMap((customer) =>
      customer.subscriptions.filter(isSubscriptionActive),
    );

    if (activeSubscriptions.length > 0) {
      throw new Error(
        "You cannot delete your account because you have active subscriptions.",
      );
    }
  },
} satisfies NonNullable<BetterAuthOptions["user"]>["deleteUser"];
