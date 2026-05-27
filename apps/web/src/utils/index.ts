import { logger } from "@workspace/shared/logger";

import type { SyntheticEvent } from "react";

export function onPromise<T>(promise: (event: SyntheticEvent) => Promise<T>) {
  return (event: SyntheticEvent) => {
    promise(event).catch((error) => {
      logger.error("Unexpected error", error);
    });
  };
}
