import { execSync } from "node:child_process";

import type { PlopTypes } from "@turbo/gen";

export function createPackageGenerator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator("package", {
    description: "Generate a new package within monorepo",
    prompts: [
      {
        type: "input",
        name: "name",
        message:
          "What is the name of the package? (You can skip the `@workspace/` prefix): ",
      },
      {
        type: "input",
        name: "deps",
        message:
          "Enter a space separated list of dependencies you would like to install: ",
      },
    ],
    actions: [
      (answers: Record<string, unknown>) => {
        if ("name" in answers && typeof answers.name === "string") {
          if (answers.name.startsWith("@workspace/")) {
            answers.name = answers.name.replace("@workspace/", "");
          }
        }
        return "Config sanitized";
      },
      {
        type: "add",
        path: "packages/{{ name }}/package.json",
        templateFile: "templates/package/package.json.hbs",
      },
      {
        type: "add",
        path: "packages/{{ name }}/tsconfig.json",
        templateFile: "templates/package/tsconfig.json.hbs",
      },
      {
        type: "add",
        path: "packages/{{ name }}/vitest.config.ts",
        templateFile: "templates/package/vitest.config.ts.hbs",
      },
      {
        type: "add",
        path: "packages/{{ name }}/src/index.ts",
        template: "export const name = '{{ name }}';",
      },
      {
        type: "modify",
        path: "packages/{{ name }}/package.json",
        async transform(content: string, answers: { deps: string }) {
          const pkg = JSON.parse(content) as {
            dependencies?: Record<string, string>;
          };

          for (const dep of answers.deps.split(" ").filter(Boolean)) {
            const version = await fetch(
              `https://registry.npmjs.org/-/package/${dep}/dist-tags`,
            )
              .then((res) => res.json())
              .then((json) =>
                json &&
                typeof json === "object" &&
                "latest" in json &&
                typeof json.latest === "string"
                  ? json.latest
                  : undefined,
              );

            if (!pkg.dependencies) pkg.dependencies = {};
            pkg.dependencies[dep] = `^${version}`;
          }
          return JSON.stringify(pkg, null, 2);
        },
      },
      async () => {
        /**
         * Install dependencies and format everything
         */
        execSync(
          "pnpm dlx sherif@latest -r packages-without-package-json --fix",
          {
            stdio: "inherit",
          },
        );
        execSync("pnpm i", { stdio: "inherit" });
        execSync(`pnpm run format:fix`);
        return "Package scaffolded";
      },
    ],
  });
}
