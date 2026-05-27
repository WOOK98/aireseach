import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";

import { ac, roles } from "@workspace/auth";
import {
  adminClient,
  anonymousClient,
  emailOTPClient,
  magicLinkClient,
  twoFactorClient,
  organizationClient,
  inferAdditionalFields,
  lastLoginMethodClient,
  createAuthClient,
  expoClient,
} from "@workspace/auth/client/mobile";
import { config } from "@workspace/i18n";
import { Platform } from "@workspace/shared/constants";

import { getBaseUrl } from "~/lib/api/utils";
import { useI18nConfig } from "~/lib/providers/i18n";

import type { auth } from "@workspace/auth/server";

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  disableDefaultFetchPlugins: true,
  fetchOptions: {
    headers: {
      "x-client-platform": Platform.MOBILE,
      origin: Linking.createURL(""),
    },
    throw: true,
  },
  plugins: [
    anonymousClient(),
    emailOTPClient(),
    magicLinkClient(),
    twoFactorClient(),
    adminClient(),
    organizationClient({
      ac,
      roles,
    }),
    lastLoginMethodClient({
      storage: SecureStore,
    }),
    inferAdditionalFields<typeof auth>(),
    expoClient({
      storage: SecureStore,
      cookiePrefix: "turbostarter",
    }),
    {
      id: "locale-cookie",
      fetchPlugins: [
        {
          id: "locale-cookie",
          name: "Locale",
          hooks: {
            onRequest: (ctx) => {
              const locale = `${config.cookie}=${useI18nConfig.getState().config.locale}`;
              if (ctx.headers instanceof Headers) {
                const cookie = ctx.headers.get("cookie");
                ctx.headers.set(
                  "cookie",
                  `${locale}${cookie ? `; ${cookie}` : ""}`,
                );
              }
              return ctx;
            },
          },
        },
      ],
    },
  ],
});
