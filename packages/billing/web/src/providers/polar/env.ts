import { defineEnv } from "envin";
import * as z from "zod";

import { envConfig, NodeEnv } from "@workspace/shared/constants";

import type { Preset } from "envin/types";

export const preset = {
  id: "polar",
  server: {
    POLAR_ACCESS_TOKEN: z.string(),
    POLAR_WEBHOOK_SECRET: z.string(),
    POLAR_ORGANIZATION_SLUG: z.string().optional(),
  },
} as const satisfies Preset;

export const env = defineEnv({
  ...envConfig,
  ...preset,
  shared: {
    NODE_ENV: z.enum(NodeEnv).default(NodeEnv.DEVELOPMENT),
  },
});
