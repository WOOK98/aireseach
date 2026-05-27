import { defineConfig } from "oxlint";

import baseConfig from "@workspace/oxlint/base";
import expoConfig from "@workspace/oxlint/expo";
import reactConfig from "@workspace/oxlint/react";

export default defineConfig({
  extends: [baseConfig, reactConfig, expoConfig],
  overrides: [
    {
      files: ["**/uniwind-types.d.ts"],
      rules: {
        "unicorn/require-module-specifiers": "off",
      },
    },
  ],
});
