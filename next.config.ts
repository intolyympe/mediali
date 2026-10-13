import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // L'espace « greffe » s'appelle désormais « juridiction » (anciens liens)
  async redirects() {
    return [{ source: "/greffe/:path*", destination: "/juridiction/:path*", permanent: false }]
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
