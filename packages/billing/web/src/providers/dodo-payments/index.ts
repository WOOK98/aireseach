import { BillingProvider } from "../types";
import { checkout } from "./checkout";
import { getBillingPortal } from "./customer";
import { updateSubscription } from "./subscription";
import { getUsage, recordUsage } from "./usage";
import { webhookHandler } from "./webhook";

import type { BillingProviderStrategy } from "../types";

export const strategy = {
  webhookHandler,
  checkout,
  getBillingPortal,
  updateSubscription,
  recordUsage,
  getUsage,
  provider: BillingProvider.DODO_PAYMENTS,
} satisfies BillingProviderStrategy;
