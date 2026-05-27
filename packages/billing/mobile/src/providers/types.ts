import type { PaywallCallbacks, PaywallResult } from "../types";

export const BillingProvider = {
  REVENUECAT: "revenuecat",
  SUPERWALL: "superwall",
} as const;

export type BillingProvider =
  (typeof BillingProvider)[keyof typeof BillingProvider];

export interface Entitlement {
  id: string;
  active: boolean;
  variantId?: string;
}

export interface BillingProviderClientStrategy {
  provider: BillingProvider;
  Provider: ({ children }: { children: React.ReactNode }) => React.ReactNode;
  useCustomer: () => {
    customer: unknown;
    entitlements: Entitlement[];
    identify: (userId: string, traits?: Record<string, string | null>) => void;
    reset: () => void;
    linkToPortal: ({
      store,
      variantId,
    }: {
      store: string;
      variantId?: string;
    }) => Promise<void>;
  };
  usePaywall: (callbacks?: PaywallCallbacks) => {
    present: <T extends { trigger: string }>(props: T) => Promise<void>;
    result: PaywallResult;
  };
}

export interface BillingProviderServerStrategy {
  provider: BillingProvider;
  webhookHandler: (
    req: Request,
    callbacks?: WebhookCallbacks,
  ) => Promise<Response>;
}

export interface WebhookCallbacks {
  onSubscriptionCreated?: (subscriptionId: string) => Promise<void> | void;
  onSubscriptionUpdated?: (subscriptionId: string) => Promise<void> | void;
  onSubscriptionDeleted?: (subscriptionId: string) => Promise<void> | void;
  onOneTimePurchaseSucceeded?: (orderId: string) => Promise<void> | void;
  onEvent?: (event: unknown) => Promise<void> | void;
}
