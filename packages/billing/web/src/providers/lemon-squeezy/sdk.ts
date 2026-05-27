import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";

import { HttpStatusCode } from "@workspace/shared/constants";
import { logger } from "@workspace/shared/logger";
import { HttpException } from "@workspace/shared/utils";

import { env } from "./env";

export const initialize = () =>
  lemonSqueezySetup({
    apiKey: env.LEMON_SQUEEZY_API_KEY,
    onError: (error) => {
      logger.error(error);
      throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR, {
        code: "billing:error.lemonSqueezy",
        message: error.message,
      });
    },
  });
