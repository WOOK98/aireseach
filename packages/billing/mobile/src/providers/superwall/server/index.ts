import { BillingProvider } from "../../types";
import { webhookHandler } from "./webhook";

import type { BillingProviderServerStrategy } from "../../types";

export const strategy = {
  provider: BillingProvider.SUPERWALL,
  webhookHandler,
} as const satisfies BillingProviderServerStrategy;
