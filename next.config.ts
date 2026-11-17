import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingIncludes: { "/*": ["./assets/fonts/*.ttf", "./public/brand/*.png", "./public/images/products/**/*"] },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Product photos are served from the public Cloudflare R2 bucket (URLs come from mockapi).
    remotePatterns: process.env.NEXT_PUBLIC_IMAGE_BASE_URL
      ? [new URL(`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL.replace(/\/$/, "")}/**`)]
      : [],
  },
  // Brand logos uploaded in the admin live in R2 at brands/<slug>. They are drawn with CSS mask-image,
  // which needs CORS for cross-origin files — proxying through this origin avoids configuring the bucket.
  async rewrites() {
    const base = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace(/\/$/, "");
    return base ? [{ source: "/brand-logos/:slug", destination: `${base}/brands/:slug` }] : [];
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
