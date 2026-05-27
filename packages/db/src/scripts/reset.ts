import { reset } from "drizzle-seed";

import { logger } from "@workspace/shared/logger";

import * as schema from "../schema";
import { db } from "../server";

async function main() {
  await reset(db, schema);

  logger.info("Database reset successfully!");
  process.exit(0);
}

main().catch((error) => {
  logger.error(error);
  process.exit(1);
});
