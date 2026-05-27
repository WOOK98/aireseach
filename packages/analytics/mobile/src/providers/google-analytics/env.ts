import { defineEnv } from "envin";

import { envConfig } from "@workspace/shared/constants";

import type { Preset } from "envin/types";

export const preset = {
  id: "google-analytics",
  clientPrefix: "EXPO_PUBLIC_",
  client: {},
} as const satisfies Preset;

export const env = defineEnv({
  ...envConfig,
  ...preset,
});
