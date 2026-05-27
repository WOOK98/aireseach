import { z } from "zod";

import { env } from "./env";

import type {
  AllowedPropertyValues,
  AnalyticsProviderClientStrategy,
} from "@workspace/analytics";

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, unknown> },
    ) => void;
  }
}

const STORAGE_KEYS = {
  USER_ID: "plausible_user_id",
  USER_TRAITS: "plausible_user_traits",
} as const;

const ValueSchema = z.union([z.string(), z.number(), z.boolean()]);
const TraitsSchema = z.record(z.string(), ValueSchema);

const getStoredIdentity = () => {
  if (typeof window === "undefined") {
    return { userId: undefined, traits: undefined };
  }

  try {
    const userId = localStorage.getItem(STORAGE_KEYS.USER_ID) ?? undefined;
    const traitsStr = localStorage.getItem(STORAGE_KEYS.USER_TRAITS);

    let traits: Record<string, AllowedPropertyValues> | undefined;
    if (traitsStr) {
      const parsed = TraitsSchema.safeParse(JSON.parse(traitsStr));
      if (parsed.success) {
        traits = parsed.data;
      }
    }

    return { userId, traits };
  } catch {
    return { userId: undefined, traits: undefined };
  }
};

export const strategy = {
  Provider: ({ children }) => {
    return (
      <>
        {children}
        <script
          defer
          data-domain={env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
          src={`${env.NEXT_PUBLIC_PLAUSIBLE_HOST}/js/script.js`}
        />
      </>
    );
  },
  track: (event, data) => {
    if (typeof window === "undefined" || !window.plausible) {
      return;
    }

    const { userId, traits } = getStoredIdentity();

    const props: Record<string, unknown> = {
      ...traits,
      ...data,
    };

    if (userId) {
      props.userId = userId;
    }

    window.plausible(event, {
      props,
    });
  },
  identify: (userId, traits) => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
      if (traits) {
        localStorage.setItem(STORAGE_KEYS.USER_TRAITS, JSON.stringify(traits));
      }
    } catch {
      // Ignore storage errors
    }
  },
  reset: () => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.removeItem(STORAGE_KEYS.USER_ID);
      localStorage.removeItem(STORAGE_KEYS.USER_TRAITS);
    } catch {
      // Ignore storage errors
    }
  },
} satisfies AnalyticsProviderClientStrategy;
