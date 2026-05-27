import { defineBackground } from "wxt/utils/define-background";

import { logger } from "@workspace/shared/logger";

import "./messaging/hello";

const main = () => {
  logger.info(
    "Background service worker is running! Edit `src/app/background` and save to reload.",
  );
};

export default defineBackground(main);
