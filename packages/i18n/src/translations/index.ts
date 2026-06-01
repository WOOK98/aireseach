import { en } from "./en";

import type { config } from "../config";

export const translations: Record<(typeof config.locales)[number], typeof en> =
  {
    en,
  } as const;
