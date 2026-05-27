import { defineConfig } from "oxlint";

import baseConfig from "@workspace/oxlint/base";
import nextjsConfig from "@workspace/oxlint/nextjs";
import reactConfig from "@workspace/oxlint/react";

export default defineConfig({
  extends: [baseConfig, reactConfig, nextjsConfig],
});
