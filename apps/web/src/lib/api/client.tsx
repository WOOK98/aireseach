import { hc } from "hono/client";

import { ExecutionSide, Platform } from "@workspace/shared/constants";

import { getBaseUrl } from "./utils";

import type { AppRouter } from "@workspace/api";

export const { api } = hc<AppRouter>(getBaseUrl(), {
  headers: {
    "x-client-platform": `${Platform.WEB}-${ExecutionSide.CLIENT}`,
  },
  init: {
    credentials: "include",
  },
});
