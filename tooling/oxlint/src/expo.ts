import { defineConfig } from "oxlint";

export default defineConfig({
  jsPlugins: ["eslint-plugin-expo"],
  globals: {
    ErrorUtils: "off",
    FormData: "off",
    XMLHttpRequest: "off",
    alert: "off",
    cancelAnimationFrame: "off",
    cancelIdleCallback: "off",
    clearImmediate: "off",
    fetch: "off",
    navigator: "off",
    process: "off",
    requestAnimationFrame: "off",
    requestIdleCallback: "off",
    setImmediate: "off",
    window: "off",
  },
  rules: {
    "expo/no-env-var-destructuring": "error",
    "expo/no-dynamic-env-var": "error",
    "expo/use-dom-exports": "error",
    "expo/prefer-box-shadow": "warn",
  },
});
