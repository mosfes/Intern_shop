import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Product photos are served from the public Cloudflare R2 bucket (URLs come from mockapi).
    remotePatterns: process.env.NEXT_PUBLIC_IMAGE_BASE_URL
      ? [new URL(`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL.replace(/\/$/, "")}/**`)]
      : [],
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
