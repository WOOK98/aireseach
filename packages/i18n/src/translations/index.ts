import { en } from "./en";
import { es } from "./es";

import type { config } from "../config";

export const translations: Record<
  (typeof config.locales)[number],
  typeof en & typeof es
> = {
  en,
  es,
} as const;
