import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// No nonces: Next.js inline bootstrap scripts need 'unsafe-inline'. Omise.js is loaded on checkout
// for card tokenisation (vault.omise.co) and PromptPay QR images come from Omise; product images
// may be any HTTPS host stored in MockAPI, so img-src stays at https:.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://cdn.omise.co${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.omise.co",
  "frame-src https://*.omise.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  // same-origin-allow-popups keeps payment/OAuth redirects working; COEP is skipped because it would
  // block cross-origin product images and Omise.js.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  outputFileTracingIncludes: { "/*": ["./assets/fonts/*.ttf", "./public/brand/*.png", "./public/images/products/**/*"] },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Vercel bills every cache miss as a transformation, so keep the variant count small and cache long:
    // product photos rarely change (a new upload gets a new URL), so 31 days instead of the 4-hour default.
    minimumCacheTTL: 2678400,
    // Fewer widths = fewer unique (src, width) variants per image. Defaults are 8 device + 7 image sizes.
    deviceSizes: [640, 1080, 1920],
    imageSizes: [64, 128, 256, 384],
    formats: ["image/webp"],
    qualities: [75],
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
