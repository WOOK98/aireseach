import { defineEnv } from "envin";
import * as z from "zod";

import { envConfig } from "@workspace/shared/constants";

import { sharedPreset } from "../../utils/env";

import type { Preset } from "envin/types";

export const preset = {
  id: "postmark",
  server: {
    POSTMARK_API_KEY: z.string(),
  },
  extends: [sharedPreset],
} as const satisfies Preset;

export const env = defineEnv({
  ...envConfig,
  ...preset,
});
