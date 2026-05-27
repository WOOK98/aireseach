import { BillingProvider } from "../../types";
import { webhookHandler } from "./webhook";

import type { BillingProviderServerStrategy } from "../../types";

export const strategy = {
  provider: BillingProvider.REVENUECAT,
  webhookHandler,
} as const satisfies BillingProviderServerStrategy;
