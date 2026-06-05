import type { NextConfig } from "next";
import "./env.config";

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
};

export default config;
