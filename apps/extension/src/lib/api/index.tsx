import { hc } from "hono/client";

import { Platform } from "@workspace/shared/constants";

import { appConfig } from "~/config/app";

import type { AppRouter } from "@workspace/api";

export const getBaseUrl = () => {
  return appConfig.url;
};

export const { api } = hc<AppRouter>(getBaseUrl(), {
  headers: {
    "x-client-platform": Platform.EXTENSION,
  },
});
