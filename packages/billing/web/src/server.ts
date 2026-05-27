import { strategy } from "./providers";

export const {
  webhookHandler,
  checkout,
  getBillingPortal,
  provider,
  updateSubscription,
  recordUsage,
  getUsage,
} = strategy;
