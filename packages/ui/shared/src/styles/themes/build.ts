import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

import { themes } from "./themes";

import type { ColorVariable, ThemeColorsVariables } from "../../types";

const OUTPUT_PATH = "variables.css";

const oklchToString = (l: number, c: number, h: number, a?: number) =>
  `oklch(${l} ${c} ${h}${a ? ` / ${a * 100}%` : ""})`;

const indent = (level: number) => "  ".repeat(level);

const generateCSSVariables = (theme: ThemeColorsVariables, indentLevel = 0) =>
  Object.entries(theme)
    .map(
      ([key, value]: [string, ColorVariable]) =>
        // @ts-expect-error - value is actually a tuple
        `${indent(indentLevel)}--${key}: ${oklchToString(...value)};`,
    )
    .join("\n");

const generateThemeCSS = () => {
  const themeEntries = Object.entries(themes);
  const defaultTheme = themeEntries[0]?.[1];

  if (!defaultTheme) {
    throw new Error("No themes found");
  }

  const generatedFileHeader = [
    "/*",
    " * This file is auto-generated. Do NOT edit it directly.",
    " *",
    " * Edit the theme source files instead:",
    " * - ./themes.ts",
    " * - ./colors/*.ts",
    " */",
    "",
  ].join("\n");

  const defaultThemeCss = [
    `${indent(2)}@variant light {`,
    generateCSSVariables(defaultTheme.light, 3),
    `${indent(2)}}`,
    "",
    `${indent(2)}@variant dark {`,
    generateCSSVariables(defaultTheme.dark, 3),
    `${indent(2)}}`,
  ].join("\n");

  const themeCss = themeEntries
    .map(([themeName, { light, dark }]) =>
      [
        `${indent(2)}[data-theme="${themeName}"] {`,
        generateCSSVariables(light, 3),
        "",
        `${indent(3)}@variant dark {`,
        generateCSSVariables(dark, 4),
        `${indent(3)}}`,
        `${indent(2)}}`,
      ].join("\n"),
    )
    .join("\n\n");

  return [
    generatedFileHeader,
    "@layer theme {",
    `${indent(1)}:root {`,
    defaultThemeCss,
    "",
    themeCss,
    `${indent(1)}}`,
    "}",
  ].join("\n");
};

const outputPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  `./${OUTPUT_PATH}`,
);

fs.writeFileSync(outputPath, `${generateThemeCSS()}\n`, "utf8");
console.log(`CSS file generated at: ${outputPath}`);
