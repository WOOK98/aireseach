import { defineEnv } from "envin";
import * as z from "zod";

import { envConfig } from "@workspace/shared/constants";

import type { Preset } from "envin/types";

export const preset = {
  id: "plausible",
  clientPrefix: "NEXT_PUBLIC_",
  client: {
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN: z.string(),
    NEXT_PUBLIC_PLAUSIBLE_HOST: z.string(),
  },
} as const satisfies Preset;

export const env = defineEnv({
  ...envConfig,
  ...preset,
  env: {
    ...process.env,
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
    NEXT_PUBLIC_PLAUSIBLE_HOST: process.env.NEXT_PUBLIC_PLAUSIBLE_HOST,
  },
});
