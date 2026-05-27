import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "url";
import { type Plugin, transformWithOxc } from "vite";
import svgr from "vite-plugin-svgr";
import { defineConfig } from "wxt";

const svgJsxTransformPlugin = (): Plugin => ({
  name: "extension-svg-jsx-transform",
  async transform(code, id) {
    const path = id.split("?")[0] ?? id;

    if (!path.endsWith(".svg")) {
      return null;
    }

    const result = await transformWithOxc(code, id, {
      lang: "jsx",
      jsx: {
        runtime: "classic",
      },
    });

    return {
      code: result.code,
      map: null,
    };
  },
});

export default defineConfig({
  manifest: async () => {
    const { appConfig } = await import("./src/config/app");
    return {
      name: appConfig.name,
      permissions: ["storage", "cookies", "sidePanel"],
      host_permissions: ["<all_urls>"],
      browser_specific_settings: {
        gecko: {
          strict_min_version: "140.0",
          data_collection_permissions: {
            required: ["personallyIdentifyingInfo"],
            optional: ["technicalAndInteraction"],
          },
        },
        gecko_android: {
          strict_min_version: "142.0",
        },
      },
    };
  },
  dev: {
    server: {
      port: 1234,
    },
  },
  webExt: {
    disabled: true,
  },
  srcDir: "src",
  entrypointsDir: "app",
  outDir: "build",
  modules: ["@wxt-dev/module-react", "@wxt-dev/auto-icons"],
  imports: false,
  vite: () => ({
    plugins: [
      tailwindcss(),
      svgr({
        include: "**/*.svg",
      }),
      svgJsxTransformPlugin(),
    ],
    optimizeDeps: {
      exclude: ["*/build"],
    },
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    define: {
      "process.env": Object.fromEntries(
        Object.entries(import.meta.env).filter(
          ([key]) => key.toLowerCase() !== "path",
        ),
      ),
    },
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  }),
});
