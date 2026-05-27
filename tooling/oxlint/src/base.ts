import i18nextPlugin from "eslint-plugin-i18next";
import turboPlugin from "eslint-plugin-turbo";
import { defineConfig } from "oxlint";

function getPluginRules(config: unknown): Record<string, unknown> {
  if (
    config === null ||
    typeof config !== "object" ||
    Array.isArray(config) ||
    !("rules" in config)
  )
    return {};
  return (config.rules as Record<string, unknown>) ?? {};
}

export default defineConfig({
  plugins: [
    "eslint",
    "typescript",
    "unicorn",
    "oxc",
    "import",
    "jsdoc",
    "node",
    "promise",
  ],
  jsPlugins: [
    "eslint-plugin-i18next",
    "eslint-plugin-turbo",
    "eslint-plugin-unused-imports",
  ],
  categories: {
    correctness: "error",
    suspicious: "error",
    perf: "error",
  },
  rules: {
    ...getPluginRules(i18nextPlugin.configs?.recommended),
    ...getPluginRules(turboPlugin.configs?.recommended),

    "no-shadow": "off",
    "no-map-spread": "off",
    "no-await-in-loop": "off",
    "no-underscore-dangle": "off",

    "typescript/no-unsafe-type-assertion": "off",
    "typescript/consistent-return": "off",
    "typescript/no-unnecessary-type-parameters": "off",

    "unicorn/no-array-sort": "off",
    "unicorn/no-array-reverse": "off",

    "import/namespace": "off",
    "import/no-unassigned-import": "off",

    "unused-imports/no-unused-imports": "error",
  },
  overrides: [
    {
      files: ["**/env*.ts"],
      rules: {
        "turbo/no-undeclared-env-vars": "off",
        "typescript/no-unsafe-assignment": "off",
        "typescript/no-unsafe-argument": "off",
      },
    },
    {
      files: [
        "**/*.{test,spec}.{ts,tsx,js,jsx}",
        "**/__tests__/**/*.{ts,tsx,js,jsx}",
      ],
      plugins: ["jest", "vitest"],
      rules: {
        "jest/no-conditional-expect": "off",
        "vitest/no-conditional-expect": "off",
      },
    },
  ],
});
