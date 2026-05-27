import { BillingProvider } from "../types";
import { checkout, getBillingPortal } from "./checkout";
import { initialize } from "./sdk";
import { updateSubscription } from "./subscription";
import { getUsage, recordUsage } from "./usage";
import { webhookHandler } from "./webhook";

import type { BillingProviderStrategy } from "../types";

initialize();

export const strategy = {
  webhookHandler,
  checkout,
  getBillingPortal,
  updateSubscription,
  recordUsage,
  getUsage,
  provider: BillingProvider.LEMON_SQUEEZY,
} satisfies BillingProviderStrategy;
