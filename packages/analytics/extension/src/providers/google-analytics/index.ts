import { z } from "zod";

import { logger } from "@workspace/shared/logger";

import { hasTechnicalAndInteractionConsent } from "../data-collection";
import { env } from "./env";

import type {
  AllowedPropertyValues,
  AnalyticsProviderClientStrategy,
} from "@workspace/analytics";

const STORAGE_KEYS = {
  CLIENT_ID: "ga_client_id",
  USER_ID: "ga_user_id",
  USER_PROPERTIES: "ga_user_properties",
} as const;

const StorageSchema = z.object({
  [STORAGE_KEYS.CLIENT_ID]: z.string().optional(),
  [STORAGE_KEYS.USER_ID]: z.string().optional(),
  [STORAGE_KEYS.USER_PROPERTIES]: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

type StorageData = z.infer<typeof StorageSchema>;

const getIdentity = async () => {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.CLIENT_ID,
    STORAGE_KEYS.USER_ID,
    STORAGE_KEYS.USER_PROPERTIES,
  ]);

  const parsed = StorageSchema.safeParse(stored);
  const data = parsed.success ? parsed.data : ({} as StorageData);

  let clientId = data[STORAGE_KEYS.CLIENT_ID];
  if (!clientId) {
    clientId = window.crypto.randomUUID();
    await chrome.storage.local.set({ [STORAGE_KEYS.CLIENT_ID]: clientId });
  }

  return {
    clientId,
    userId: data[STORAGE_KEYS.USER_ID],
    userProperties: data[STORAGE_KEYS.USER_PROPERTIES],
  };
};

const postEvent = async (
  event: string,
  data?: Record<string, AllowedPropertyValues>,
) => {
  if (!(await hasTechnicalAndInteractionConsent())) {
    return;
  }

  const identity = await getIdentity();

  // Prefer clientId passed in data, fall back to stored identity
  const dataClientId =
    data && "clientId" in data && typeof data.clientId === "string"
      ? data.clientId
      : undefined;

  const clientId = dataClientId ?? identity.clientId;

  const body: Record<string, unknown> = {
    client_id: clientId,
    events: [{ name: event, params: data }],
  };

  if (identity.userId) {
    body.user_id = identity.userId;
  }

  if (identity.userProperties) {
    body.user_properties = Object.entries(identity.userProperties).reduce(
      (acc, [key, value]) => {
        acc[key] = { value };
        return acc;
      },
      {} as Record<string, { value: AllowedPropertyValues }>,
    );
  }

  const response = await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${env.VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID}&api_secret=${env.VITE_GOOGLE_ANALYTICS_SECRET}`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    logger.error("Failed to post event to Google Analytics: ", response);
  }
};

export const strategy = {
  track: (name, params) => {
    void postEvent(name, params);
  },
  identify: (userId, traits) => {
    void (async () => {
      await chrome.storage.local.set({
        [STORAGE_KEYS.USER_ID]: userId,
        [STORAGE_KEYS.USER_PROPERTIES]: traits,
      });
    })();
  },
  reset: () => {
    void (async () => {
      await chrome.storage.local.remove([
        STORAGE_KEYS.CLIENT_ID,
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.USER_PROPERTIES,
      ]);
    })();
  },
} satisfies Omit<AnalyticsProviderClientStrategy, "Provider">;
