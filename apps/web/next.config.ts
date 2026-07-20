import "./env.config";
import type { NextConfig } from "next";

const INTERNAL_PACKAGES = [
  "@workspace/analytics-web",
  "@workspace/api",
  "@workspace/auth",
  "@workspace/billing",
  "@workspace/billing-web",
  "@workspace/cms",
  "@workspace/email",
  "@workspace/db",
  "@workspace/i18n",
  "@workspace/monitoring-web",
  "@workspace/shared",
  "@workspace/storage",
  "@workspace/ui",
  "@workspace/ui-web",
];

const config: NextConfig = {
  reactStrictMode: true,

  // Performance: compress responses
  compress: true,

  // Performance: experimental optimizations
  experimental: {
    optimizePackageImports: INTERNAL_PACKAGES,
    // Optimize CSS delivery
    optimizeCss: true,
  },

  turbopack: {
    resolveAlias: {
      "../build/polyfills/polyfill-module": "./src/lib/noop-polyfill.ts",
      "next/dist/build/polyfills/polyfill-module": "./src/lib/noop-polyfill.ts",
    },
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },

  images: {
    remotePatterns: [
      {
        hostname: "images.unsplash.com",
      },
    ],
  },

  /** Enables hot reloading for local packages without a build step */
  transpilePackages: INTERNAL_PACKAGES,

  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },

  async redirects() {
    return [
      // Retired dashboard routes → new research page
      {
        source: "/:locale/dashboard/report",
        destination: "/:locale/dashboard/research",
        permanent: true,
      },
      {
        source: "/:locale/dashboard/committee",
        destination: "/:locale/dashboard/research",
        permanent: true,
      },
      {
        source: "/:locale/dashboard/ai",
        destination: "/:locale/dashboard/research",
        permanent: true,
      },
      // Non-locale variants
      {
        source: "/dashboard/report",
        destination: "/dashboard/research",
        permanent: true,
      },
      {
        source: "/dashboard/committee",
        destination: "/dashboard/research",
        permanent: true,
      },
      {
        source: "/dashboard/ai",
        destination: "/dashboard/research",
        permanent: true,
      },
      // Marketing report page → authenticated research
      {
        source: "/:locale/report",
        destination: "/:locale/dashboard/research",
        permanent: true,
      },
      {
        source: "/report",
        destination: "/dashboard/research",
        permanent: true,
      },
    ];
  },
};

export default config;
