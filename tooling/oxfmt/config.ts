import { defineConfig } from "oxfmt";

export default defineConfig({
  singleQuote: false,
  trailingComma: "all",
  tabWidth: 2,
  useTabs: false,
  printWidth: 80,
  ignorePatterns: ["**/.*", "**/*.hbs"],
  sortImports: {
    internalPattern: ["#", "~/", "@/", "@workspace/"],
    customGroups: [
      {
        groupName: "app",
        elementNamePattern: ["~/**"],
        modifiers: ["value"],
      },
      {
        groupName: "workspace",
        elementNamePattern: ["@workspace/**"],
        modifiers: ["value"],
      },
    ],
    groups: [
      ["value-builtin", "value-external"],
      "workspace",
      "app",
      "value-internal",
      ["value-parent", "value-sibling", "value-index"],
      [
        "type-internal",
        "type-external",
        "type-builtin",
        "type-parent",
        "type-sibling",
        "type-index",
        "type-import",
      ],
      "unknown",
    ],
  },
  sortTailwindcss: {
    functions: ["cn", "cva"],
    preserveWhitespace: true,
  },
});
