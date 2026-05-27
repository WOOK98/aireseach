import { hc } from "hono/client";
import { headers } from "next/headers";

import { ExecutionSide, Platform } from "@workspace/shared/constants";

import { getBaseUrl } from "./utils";

import type { AppRouter } from "@workspace/api";

export const { api } = hc<AppRouter>(getBaseUrl(), {
  headers: async () => ({
    ...Object.fromEntries((await headers()).entries()),
    "x-client-platform": `${Platform.WEB}-${ExecutionSide.SERVER}`,
  }),
});
