import { defineConfig } from "oxlint";

import baseConfig from "@workspace/oxlint/base";

export default defineConfig({
  extends: [baseConfig],
  options: {
    typeAware: true,
    typeCheck: true,
  },
});
