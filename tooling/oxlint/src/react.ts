import queryPlugin from "@tanstack/eslint-plugin-query";
import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["react", "react-perf", "jsx-a11y"],
  jsPlugins: ["@tanstack/eslint-plugin-query"],
  env: {
    browser: true,
  },
  rules: {
    ...queryPlugin.configs.recommended.rules,
    "react/no-array-index-key": "off",
    "react/only-export-components": "off",
    "react/jsx-boolean-value": "off",
    "react/jsx-no-constructed-context-values": "off",
    "react/react-in-jsx-scope": "off",
    "react/jsx-filename-extension": "off",
    "react/no-unknown-property": "off",
    "react/jsx-props-no-spreading": "off",
    "react/jsx-max-depth": "off",
    "react/no-multi-comp": "off",

    "react_perf/jsx-no-jsx-as-prop": "off",
    "react_perf/jsx-no-new-object-as-prop": "off",
    "react_perf/jsx-no-new-array-as-prop": "off",
    "react_perf/jsx-no-new-function-as-prop": "off",

    "jsx-a11y/prefer-tag-over-role": "off",
    "jsx-a11y/click-events-have-key-events": "off",
    "jsx-a11y/no-autofocus": "off",
  },
});
