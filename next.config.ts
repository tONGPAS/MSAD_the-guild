import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  //Classic request-time rendering: every page here is per-user, so Cache Components adds complexity without benefit
  cacheComponents: false,
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
