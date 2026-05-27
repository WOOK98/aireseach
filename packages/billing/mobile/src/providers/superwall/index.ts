import { BillingProvider } from "../types";
import { useCustomer, usePaywall } from "./hooks";
import { Provider } from "./provider";

import type { BillingProviderClientStrategy } from "../types";

export const strategy = {
  provider: BillingProvider.SUPERWALL,
  Provider,
  useCustomer,
  usePaywall,
} as const satisfies BillingProviderClientStrategy;

export * from "./env";
