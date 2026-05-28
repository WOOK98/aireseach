import { en } from "./en";
import { es } from "./es";
import { zhTW } from "./zh-TW";

import type { config } from "../config";

export const translations: Record<
  (typeof config.locales)[number],
  typeof en & typeof es
> = {
  en,
  es,
  "zh-TW": zhTW,
} as const;
