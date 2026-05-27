import { hc } from "hono/client";

import { config } from "@workspace/i18n";
import { Platform } from "@workspace/shared/constants";

import { authClient } from "~/lib/auth";
import { useI18nConfig } from "~/lib/providers/i18n";

import { getBaseUrl } from "./utils";

import type { AppRouter } from "@workspace/api";

export const { api } = hc<AppRouter>(getBaseUrl(), {
  headers: () => ({
    cookie: `${config.cookie}=${useI18nConfig.getState().config.locale};${authClient.getCookie()}`,
    "x-client-platform": Platform.MOBILE,
  }),
  init: {
    /* https://github.com/better-auth/better-auth/issues/2970 */
    credentials: "omit",
  },
});
