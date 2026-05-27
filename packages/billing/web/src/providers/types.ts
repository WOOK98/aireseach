import { GetUsagePayload } from "../schema/usage";

import type { CheckoutPayload, GetBillingPortalPayload } from "../schema";

export interface BillingUser {
  id: string;
  email: string;
}

export interface WebhookCallbacks {
  onCheckoutSessionCompleted?: (sessionId: string) => Promise<void> | void;
  onSubscriptionCreated?: (subscriptionId: string) => Promise<void> | void;
  onSubscriptionUpdated?: (subscriptionId: string) => Promise<void> | void;
  onSubscriptionDeleted?: (subscriptionId: string) => Promise<void> | void;
  onEvent?: (event: unknown) => Promise<void> | void;
}

export interface BillingProviderStrategy {
  provider: BillingProvider;
  webhookHandler: (
    req: Request,
    callbacks?: WebhookCallbacks,
  ) => Promise<Response>;
  checkout: (
    input: CheckoutPayload & { user: BillingUser },
  ) => Promise<{ url: string | null }>;
  getBillingPortal: (
    input: GetBillingPortalPayload & { user: BillingUser },
  ) => Promise<{ url: string }>;
  updateSubscription: (
    id: string,
    data: Partial<{
      quantity: number;
    }>,
  ) => Promise<void>;
  recordUsage: (input: {
    externalId: string;
    quantity: number;
    event?: string;
    timestamp?: Date;
  }) => Promise<{ recorded: boolean }>;
  getUsage: (
    input: Omit<GetUsagePayload, "referenceId"> & { externalId: string },
  ) => Promise<{ usage: number; start: Date; end: Date }>;
}

export const BillingProvider = {
  STRIPE: "stripe",
  LEMON_SQUEEZY: "lemon-squeezy",
  POLAR: "polar",
  DODO_PAYMENTS: "dodo-payments",
} as const;

export type BillingProvider =
  (typeof BillingProvider)[keyof typeof BillingProvider];
