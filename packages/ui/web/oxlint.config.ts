import { defineConfig } from "oxlint";

import baseConfig from "@workspace/oxlint/base";
import reactConfig from "@workspace/oxlint/react";

export default defineConfig({
  extends: [baseConfig, reactConfig],
});
