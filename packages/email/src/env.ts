import { defineEnv } from "envin";
import * as z from "zod";

import { envConfig } from "@workspace/shared/constants";
import { ThemeColor } from "@workspace/ui";

import { preset as providerPreset } from "./providers/env";

import type { Preset } from "envin/types";

export const preset = {
  id: "email",
  server: {
    PRODUCT_NAME: z.string().optional(),

    EMAIL_THEME: z.enum(ThemeColor).optional().default(ThemeColor.ORANGE),
  },
  extends: [providerPreset],
} as const satisfies Preset;

export const env = defineEnv({
  ...envConfig,
  ...preset,
});
