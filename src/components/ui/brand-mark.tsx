"use client";

import { useCatalogMeta } from "@/components/catalog-provider";
import { brandColors, brandLogoMap, nativeColorLogos } from "@/data/brand-logos";

const maskStyle = (src: string): React.CSSProperties => ({
  maskImage: `url(${src})`,
  WebkitMaskImage: `url(${src})`,
  maskSize: "contain",
  WebkitMaskSize: "contain",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskPosition: "center",
  WebkitMaskPosition: "center",
});

/**
 * Brand logo in its brand colour (a lighter tint on the dark theme).
 * Order: bundled SVG (known size) → logo uploaded in the admin (R2, shown as-is) → coloured text wordmark.
 * Single-colour SVGs are drawn as a CSS mask filled with the brand colour; logos that already have their own colours use <img>.
 */
export function BrandMark({ brand, compact = false }: { brand: string; compact?: boolean }) {
  const { uploadedLogoUrl } = useCatalogMeta();
  const logo = brandLogoMap[brand];
  const colors = brandColors[brand] ?? { light: "#374151", dark: "#D1D5DB" };
  const vars = { "--bc": colors.light, "--bc-dark": colors.dark } as React.CSSProperties;
  const uploaded = uploadedLogoUrl(brand);
  if (uploaded) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={uploaded} alt="" aria-hidden="true" className={`block shrink-0 rounded object-contain dark:bg-white dark:p-0.5 ${compact ? "h-5 w-12" : "h-[26px] w-[84px]"}`} />;
  }
  if (!logo) {
    return (
      <span
        aria-hidden={compact || undefined}
        className={`line-clamp-2 max-w-full px-1 text-center font-semibold uppercase leading-[1.1] tracking-wide text-[var(--bc)] dark:text-[var(--bc-dark)] ${compact ? "text-[11px]" : "text-[13px]"}`}
        style={vars}
      >
        {compact ? brand.slice(0, 2) : brand}
      </span>
    );
  }
  const h = compact ? (logo.wordmark ? 14 : 20) : logo.wordmark ? 16 : 26;
  const size = { height: h, width: Math.min(h * logo.ratio, compact ? 48 : 84) };
  if (nativeColorLogos.has(brand)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo.src} alt="" aria-hidden="true" className="block shrink-0 rounded dark:bg-white dark:p-0.5" style={size} />;
  }
  return <span
      aria-hidden="true"
      className="block shrink-0 bg-[var(--bc)] dark:bg-[var(--bc-dark)]"
      style={{ ...size, ...vars, ...maskStyle(logo.src) }}
    />;
}

