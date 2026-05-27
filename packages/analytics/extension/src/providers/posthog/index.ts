import { PostHog } from "posthog-js/dist/module.no-external";
import { v7 as uuidv7 } from "uuid";

import { hasTechnicalAndInteractionConsent } from "../data-collection";
import { env } from "./env";

import type { AnalyticsProviderClientStrategy } from "@workspace/analytics";

const posthog = new PostHog();

export async function getSharedDistinctId() {
  const stored = await chrome.storage.local.get(["posthog_distinct_id"]);
  if (stored.posthog_distinct_id) {
    return stored.posthog_distinct_id as string;
  }

  const distinctId = uuidv7();
  await chrome.storage.local.set({ posthog_distinct_id: distinctId });
  return distinctId;
}

const init = async () => {
  if (posthog.__loaded) {
    return;
  }

  const distinctID = await getSharedDistinctId();
  posthog.init(env.VITE_POSTHOG_KEY, {
    bootstrap: {
      distinctID,
    },
    api_host: env.VITE_POSTHOG_HOST,
    autocapture: false,
    capture_pageleave: false,
    capture_pageview: false,
    disable_external_dependency_loading: true,
    persistence: "localStorage",
  });
};

export const strategy = {
  track: (name, params) => {
    void (async () => {
      if (!(await hasTechnicalAndInteractionConsent())) {
        return;
      }

      await init();
      posthog.capture(name, params);
    })();
  },
  identify: (userId, traits) => {
    void (async () => {
      await init();
      posthog.identify(userId, traits);
    })();
  },
  reset: () => {
    void (async () => {
      await init();
      posthog.reset();
    })();
  },
} satisfies Omit<AnalyticsProviderClientStrategy, "Provider">;
