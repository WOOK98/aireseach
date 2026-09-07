import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: false,
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "~": "/Users/wook/Documents/aireseach/apps/web/src",
    },
  },
  test: {
    globals: true,
  },
});
